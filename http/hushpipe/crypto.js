/*
 * Async cryptographic operations
 *
 * Binds the following names (all functions are async):
 *
 * - new_key() -> key:Uint8Array
 *   Generate a new random key and put it in the browser location hash.
 *
 * - get_key_from_url() -> key:CryptoKey
 *   Parses current browser location hash.
 *
 * - encrypt_blob(key:CryptoKey, plaintext:Blob) -> ciphertext:Uint8Array
 *   Encrypts the plaintext and returns ciphertext || IV. (and GCM tag somewhere)
 *
 * - decrypt_blob(key:CryptoKey, ciphertext:Blob) -> plaintext:ArrayBuffer
 *   Decrypts ciphertext, taking IV from last IV_BYTES substring of ciphertext;
 *   checking GCM tag and throws DOMException if something goes wrong.
 *
 * - GCM_PARAMS: Constant dict for AES-256-GCM boilerplate.
 * - IV_BYTES: Constant int for denoting IV length in bytes.
 */

const GCM_PARAMS = {
    name: 'AES-GCM',
    length: 256, /* Key length, in bits */
    tagLength: 128, /* GCM MAC tag length, in bits */
    /* Here we could pass:
     * additionalData: 'extra data',
     */
};

const IV_BYTES = 16; /* Length of the AES-256-GCM initialization vector */

/*
 * Generate a new key, and replace the # in the URL with
 * the Base64-encoded representation.
 */
async function
new_key()
{
    /* 2nd arg 'true': marked available for export */
    const key = await crypto.subtle.generateKey(
	GCM_PARAMS, true,
	['encrypt', 'decrypt']
    );
    const k = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    const wtf_javascript = btoa(String.fromCharCode(...k))
	  .replace(/\+/g, '@')
	  .replace(/=/g, '_')
    ;
    document.location.hash = wtf_javascript;
    return key;
}

/*
 * Decode base64-encoded from URL after # and unpack it
 */
async function
get_key_from_url()
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

    return crypto.subtle.importKey(
	'raw',
	key_as_arr,
	GCM_PARAMS,
	false, /* extractable: Not marked available for export */
	['encrypt','decrypt'] /* usages: Context in which key can be used */
    );
}

/*
 * If all goes well, return Uint8Array with everything the receiver
 * needs to decrypt (blob).
 */
async function
encrypt_blob(key, blob)
{
    /*
     * Maybe we should operate on blob.stream() instead,
     * and use a TransformStream
     */
    const plaintext = await blob.arrayBuffer();
    const iv = await crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
	{...GCM_PARAMS,
	 'iv': iv
	}, key, plaintext));

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
decrypt_blob(key, blob)
{
    const buf = new Uint8Array(await blob.arrayBuffer());
    const iv = buf.subarray(-IV_BYTES);
    const data = buf.subarray(0, -IV_BYTES);
    return crypto.subtle.decrypt(
	{...GCM_PARAMS,
	 'iv': iv
	}, key, data);
}

/*
 * Test in browser by copy-pasting all this:
 */
/*
var o_k = await new_key();
var o_b = new Blob(['a','c','a','b']);
var enc = await encrypt_blob(o_k, o_b);
var n_k = await get_key_from_url();
var dec = await decrypt_blob(n_k, new Blob([new Uint8Array(enc)]));
String.fromCharCode(...new Uint8Array(dec));
*/
