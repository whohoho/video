let $ = a => document.querySelector(a);

let hush_key;

async function
hush_read_key()
{
//    try {
    const key = await get_key_from_url();
    hush_key = key;
    $('#hush_room_key_label').innerText = document.location.hash;
  //  } catch (e) {
//	console.log('error reading room key', e);
  //  }
}

/*
 * Callback handler for the hush_newroom button
 */
async function
hush_newroom()
{
    console.log('new room key');
    await new_key();
    hush_read_key();
}

let hush_camera_handle;

function
hush_camera_record()
{
  let svt;
  async function please_encrypt(blob_event){
      console.log('xx', blob_event, await blob_event.data.arrayBuffer());
      var ciphertext = await encrypt_blob(hush_key, blob_event.data);
      console.log('should send', ciphertext);
      var plain = await decrypt_uint8array(hush_key, ciphertext);
      console.log('plain', plain);
  }
  async function camera_works(s){
      console.log('s',s);
      svt = s.getVideoTracks()[0];
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
    hush_camera_handle
	&& hush_camera_handle.state != 'inactive'
	&& hush_camera_handle.stop();
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
}
