/*
 * Async cryptographic operations
 *
 * Binds the following names (all functions are async):
 *
 * - crypto_new_master_key() -> key:Uint8Array
 *   Generate a new random key and put it in the browser location hash.
 *
 * - crypto_derive_from_master_key(master_key:Uint8Array)
 *   -> { e2e: CryptoKey, room: string }
 *   Uses the master key to derives an AES-GCM key for end-to-end-encrypted
 *   communication, and a room name to be provided to the relay server.
 *
 * - get_master_key_from_url() -> key:Uint8Array
 *   Parses current browser location hash. Raises if length is wrong.
 *
 * - encrypt_blob(key:CryptoKey, plaintext:Blob) -> ciphertext:Uint8Array
 *   Encrypts the plaintext and returns
 *     ciphertext || IV  (and GCM tag somewhere)
 *
 * - decrypt_uint8array(key:CryptoKey, ciphertext:Uint8Array
 *   -> plaintext:ArrayBuffer
 *   Decrypts ciphertext, taking IV from last IV_BYTES substring of ciphertext;
 *   checking GCM tag and throws DOMException if something goes wrong.
 *
 * - GCM_PARAMS: Constant dict for AES-256-GCM boilerplate.
 * - IV_BYTES: Constant int for denoting IV length in bytes.
 * - MASTER_KEY_BYTES: Constant int denoting expected length of master key.
 */
'use strict';

/* Ask for fewer silent errors: */
'use strict';

const GCM_PARAMS = {
    name: 'AES-GCM',
    length: 256, /* Key length, in bits */
    tagLength: 128, /* GCM MAC tag length, in bits */
    /* Here we could pass:
     * additionalData: 'extra data',
     */
};

const IV_BYTES = 16; /* Length of the AES-256-GCM initialization vector */

const MASTER_KEY_BYTES = 32; /* Length of the raw master key */

/* TODO currently unused, but should be used for participants */
const SIGN_PARAMS = {
    name: 'ECDSA',
    hash: 'SHA-256',
    namedCurve: 'P-256',
}

/*
 * Internal function for making url-safe base64
 */
function
_crypto_uint8arr_to_base64(arr)
{
    return btoa(String.fromCharCode(...arr))
	.replace(/\+/g, '@')
	.replace(/=/g, '_');
}

// class FeedSigner {
//   constructor() {
//     return (async () => {
//       return this;
//     });
//   }
// }

async function
crypto_feedsigner(room)
{
    let db;

    let op = indexDB.open('hushpipe');
    op.onupgradeneeded = () => {
	/*
	 * Migration; make sure required data structures are here.
	 */
	db = op.result;
	let feedsign = db.createObjectStore(
	    'feedsign',
	    {keyPath: 'room'});
	let roomIndex = store.createIndex('by_room', 'room', {unique: true});
    }
    op.onsuccess = () => { db = op.result; };

    let tx = db.transaction('hushpipe', 'readwrite');
    let feedsign = tx.objectStore('feedsign');

    let key = await feedsign.get({room: room});

    if (!key) {
	/*
	 * We create this key as non-extractable.
	 * This it to prevent the server from (at a later point)
	 * extracting it and impersonating us.
	 * We can still store it in IndexedDB since that has breaks
	 * the 'non-extractable' invariant.
	 * The server can still serve us evil javascript that produces
	 * signatures, but at least that only works when they have access
	 * to the user's browser.
	 * If some kind of TEE-like mechanism existed we could use that instead.
	 * Perhaps that can be implemented with the subresource integrity
	 * mechanism: If those have a separate origin, we can make an indexeddb
	 * that is only accessible to the same code, which means a bad server
	 * cannot later mess with the keys.
	 */

	const key = await crypto.subtle.generateKey(
	    SIGN_PARAMS,
	    false, /* extractable */
	    ['sign', 'verify'],
	);
	feedsign.put({'room': room, 'key': key});
    }

    return key;
}

/*
 * Generate a new key, and replace the # in the URL with
 * the Base64-encoded representation.
 */
async function
crypto_new_master_key()
{
    const k = await crypto.getRandomValues(
	new Uint8Array(MASTER_KEY_BYTES));
    document.location.hash = _crypto_uint8arr_to_base64(k);
    return k;
}

/*
 *
 */
async function
crypto_derive_from_master_key(raw_master_key)
{

    let text = new TextEncoder(); /* TODO how do we guarantee this is utf-8? */
    const hkdfparams = {
	name: 'HKDF',
	hash: 'SHA-384',
	salt: text.encode('HushPipeHKDF_1'),
    };

    const master_key = await crypto.subtle.importKey(
	'raw',
	raw_master_key, /* ArrayBuffer*/
	{name:'HKDF', hash:'SHA-384'},
	false, ['deriveKey', 'deriveBits']);

    const e2e_key = await crypto.subtle.deriveKey(
	{ ...hkdfparams,
	  info: text.encode('e2e-key'), /* HKDF context */
	  label: 'e2e-key',
	},
	master_key,
	GCM_PARAMS,
	false, /* exportable */
	['encrypt', 'decrypt']
    );

    const room_key = await crypto.subtle.deriveKey(
	{ ...hkdfparams,
	  info: text.encode('room-name'), /* HKDF context */
	  label: 'room-name',
	},
	master_key,
	GCM_PARAMS,
	true, /* exportable */
	['encrypt','decrypt']
    );
    const room_raw = await crypto.subtle.exportKey('raw', room_key);
    const room_name = _crypto_uint8arr_to_base64(new Uint8Array(room_raw));

    return { e2e: e2e_key,
	     room: room_name, };
}

/*
 * Decode base64-encoded from URL after # and unpack it
 */
async function
get_master_key_from_url()
{
    /*
     * Get the stuff after #; fixup base64; base64-decode
     */
    const key_as_string =
	  atob(document.location.hash.substr(1)
	       .replace(/@/g,'+')
	       .replace(/_/g,'=')
	      );

    /*
     * Turn our (binary) string into an ArrayBuffer by
     * allocating new buffer, then blitting char-by-char from the string:
     */
    let key_as_arr = new Uint8Array(key_as_string.length);
    key_as_arr = key_as_arr.map((_, idx) => key_as_string.charCodeAt(idx));

    if (MASTER_KEY_BYTES != key_as_arr.length) {
	throw "invalid master key";
    }

    return key_as_arr;
}


async function
encrypt_blob(key, blob)
{
  /*
   * Maybe we should operate on blob.stream() instead,
   * and use a TransformStream
   */
  /*
  console.log('encrypt_blob',
    '\n key: ', key,
    '\n blob: ', blob
  );
  */
  const plaintext = await blob.arrayBuffer();
  return encrypt(key, plaintext);   
}


/*
 * If all goes well, return Uint8Array with everything the receiver
 * needs to decrypt (blob).
 */
async function
encrypt(key, plaintext)
{
    const iv = await crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
	{...GCM_PARAMS,
	 'iv': iv
	}, key, plaintext));
    /* TODO Things that could be put in AdditionalData:
     * - timecode
     * - codec/mimetype
     * - public key of user
     */

    /*
     * There's a proposed api for more efficient remalloc() we can use
     * now that this glorious API insists on allocating a dst buffer
     * for the ciphertext:
    let ret = new ArrayBuffer.transfer(
	ciphertext,
	ciphertext.length + iv.length);
    */
    /*
     * Now we allocate yet another copy of all this shit and
     * blit the IV onto the end of ciphertext:
     */
    const ret = new Uint8Array(iv.length + ciphertext.length);
    ret.set(ciphertext, 0);
    ret.set(iv, ciphertext.length); /* 2nd arg: offset into dst */
    return ret;
}

/*
 * Seems to throw a DOMException when key was wrong
 */
async function
decrypt_uint8array(key, buf)
{
//    console.log('buf in decrypt: ', buf)
  //const iv = 1234;
  //console.log(buf);
  //try {
    const iv = await buf.subarray(-IV_BYTES);
  //} catch (e) {
  //  console.log('iv failed: ', e);
  //  return false;
  //}
  //try {
    const data = await buf.subarray(0, -IV_BYTES);
  //} catch (e) {
  //  console.log('error with buf in decrypt', e);
  //  return;
  //}
  try {
    var decrypted = crypto.subtle.decrypt(
	{...GCM_PARAMS,
	 'iv': iv
	}, key, data);
    return decrypted;
  } catch (e) {
    console.log('err in decrypt', e);
  }
}
