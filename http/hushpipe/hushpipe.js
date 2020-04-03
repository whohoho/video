let $ = a => document.querySelector(a);

let hush_key; /* Key used to encrypt/decrypt */
let hush_room; /* Room ID derived from master key */
let hush_camera_handle; /* Handle to MediaRecorder of our camera */
let hush_camera_loopback; /* <video> element display our own camera */

async function
hush_render_friends()
{
  console.log(subscribers);
}


async function
hush_read_key()
{
//    try {
    const master_key = await get_master_key_from_url();
    const keys = await crypto_derive_from_master_key(master_key);
    console.log('keys',keys);
    hush_key = keys.e2e;
    hush_room = keys.room;
    $('#hush_room_key_label').innerText =
	'\nmaster key: ' + document.location.hash
	+ '\n\nroom name: ' + keys.room;
  //  } catch (e) {
//	console.log('error reading room key', e);
  //  }
}

let gctx;

/*
 * Callback handler for the hush_newroom button
 */
async function
hush_newroom()
{
    
    let ctx = {
      user_id: new String(Math.floor(Math.random() * (1000000001))),
      session: null,
      publisher: null,
      subscribers: {},
      videoChannel: null,
      messages: [],
      roomId: "42",

    };
    gctx = ctx;
    janus_connect(ctx, "ws://localhost:8188");

    console.log('new master key');
    await crypto_new_master_key();
    console.log('new room key');
    hush_read_key();
}

function
hush_camera_record()
{
  async function please_encrypt(blob_event){
      console.log('xx', blob_event, await blob_event.data.arrayBuffer());
      var ciphertext = await encrypt_blob(hush_key, blob_event.data);
      try {
        gctx.videoChannel.send(ciphertext);
      } catch (err) { console.log('send failed: ', err) }
      
      console.log('should send', ciphertext);
      var plain = await decrypt_uint8array(hush_key, ciphertext);
      console.log('plain', plain);
      if (hush_camera_loopback) {
	  console.log(hush_camera_loopback.buf);
	  hush_camera_loopback.buf.appendBuffer(plain);
	  hush_camera_loopback.play();
      }
  }
  async function camera_works(s){
      console.log('s',s);
      //let svt = s.getVideoTracks()[0];

      hush_camera_loopback = hush_new_feed($('#myface'));

      hush_camera_handle = new MediaRecorder(s);
      hush_camera_handle.ondataavailable = please_encrypt;
      hush_camera_handle.start(1000);
  }
  var m = navigator.getUserMedia(
      {video:true},
      camera_works,
      e=>console.log('err',e)
  );
}

function
hush_camera_stop()
{
    try {
	hush_camera_handle.stop();
    } catch (e) {}
    const myface = $('#myface');
    while (myface.firstChild) {
	myface.removeChild(myface.lastChild);
    }
    hush_camera_loopback = null;
}

/*
 * Call with $('#friends') or $('#myface')
 */
function
hush_new_feed(where)
{
    const vid = document.createElement('video');
    let m_source = new MediaSource();
    m_source.addEventListener(
	'sourceopen',
	e => {
	    console.log(e);
	    /* TODO hardcoding the codec here sucks */
	    vid.buf = m_source.addSourceBuffer('video/webm;codecs=vp8');
	});
    vid.src = URL.createObjectURL(m_source);
    vid.buffered = false; /* TODO */
    where.appendChild(vid);
    return vid;
}

async function
hush_onload()
{
    console.log('hushpipe \nTRY\nTRY\nTRY\nTRY\nTRY\nloading');

    $('#hush_newroom').onclick = hush_newroom;
    $('#hush_camera_record').onclick = hush_camera_record;
    $('#hush_camera_stop').onclick = hush_camera_stop;

    /* Check if we already have a key: */
    hush_read_key();

    console.log('hushpipe \nOK\nOK\nOK\nOK\nOK\nOK\nloading');

    setInterval(hush_render_friends());

}
