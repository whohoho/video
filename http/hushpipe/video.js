// takes datachannel event + feed element (div with 1 video inside)

export async function hush_play_datachannel(evt, feed) {
	 console.log("new video buffer: ", evt, feed);

   var uint8View = new Uint8Array(evt.data);
   hush_play_video(uint8View, feed)
}

async function
hush_append_buffer(video_element, plaintext)
{
    try {
	/* be optimistic */
	video_element.buf.appendBuffer(plaintext);
	return;
    } catch (e) {
	console.log('appendBufferfailed on',video_element, e);
	//video_element.play();
    }

    if (!video_element.buf) {
	console.log('this video element has no buf (are we in the process of making new?)', video_element);
	throw 'video has no buf';
    }
    if (video_element.buf.mode != 'segments')
	throw 'video is not segments WHAT\nx\nx\nx';
    if (video_element.buf.error) // then we should wait
	throw 'video is ERRORed WHAT\ngx\nx\nx';

    if (video_element.buf.updating){
	/*
	 * Technically speaking we should wait, instead we just drop frames
	 */
	video_element.buf.addEventListener('updateend', function () {
	    //try { video_element.buf.appendBuffer(plaintext);}catch(e){}
	}, { once: true, passive: true });
	return;
    }
    // maybe look at video_element.readyState

    try {
	video_element.buf.appendBuffer(plaintext);
    } catch (e) {
	console.log('appendBufferfailed on',video_element, e);
	//video_element.play();
    }
}
/*
 * takes encrypted uint8array + feed element (div with 1 video inside)
 * decrypts, adds the plaintext to the video buffer
 */
async function
hush_play_video(ciphertext, feed)
{
    //console.log('encrypted: ', ciphertext, 'on feed: ' , feed);
    const v = feed.getElementsByTagName('video')[0];
    console.log(
	`vid state: ${feed.parentElement.id} , v.currentTime:`,v.currentTime,
	`, v.buffered:`, v.buffered,
	`, v.currentSrc:${v.currentSrc}, v.duration:${v.duration}, v.ended:${v.ended}, v.error:`,
	v.error, `, v.networkState:${v.networkState}`);

    try {
	var plain = await decrypt_uint8array(hush_key, ciphertext);
    } catch (err) {
      console.log('decryption failed (hush_play_video): ', err, ciphertext, feed);
      return;
    }

    await hush_append_buffer(v, plain);
}

function
hush_camera_record()
{
  async function please_encrypt(blob_event){
      //console.log('xx', blob_event, await blob_event.data.arrayBuffer());
      var ciphertext = await encrypt_blob(hush_key, blob_event.data);
      try {
        gctx.videoChannel.send(ciphertext);
      } catch (err) { console.log('send failed: ', err) }
      
      //console.log('should send', ciphertext);
    
      //var plain = await decrypt_uint8array(hush_key, ciphertext);
      //console.log('plain', plain);
      if (hush_camera_loopback) {
	  //console.log(hush_camera_loopback);
	  //const preview = hush_camera_loopback.getElementsByTagName('video')[0]
    //preview.buf.appendBuffer(plain);
	  //preview.play();
      const userEl = dc.getUserEl("mine");
//  userEl.chan_video_high = highVideoChannel;
      //const feed = hush_new_feed(userEl, "video_high");
      const feed = hush_new_feed($('#myface'), "video_high");
/*
	   * TODO this is a little bit wasteful since we are decrypting
	   * our own payload, but this way we can check that our encryption
	   * worked as expected.
	   */

     await hush_play_video(ciphertext, feed)
      }
  }
  async function camera_works(s){
      console.log('s',s);
      //let svt = s.getVideoTracks()[0];

      hush_camera_loopback = hush_new_feed($('#myface'), "video_high");
      console.log('creating recorder for: ', s);
      hush_camera_handle = new MediaRecorder(s, {
        codec: HUSH_CODEC, 
        audioBitsPerSecond: 160,
        videoBitsPerSecond: 160,

      });
      console.log('recorder is: ', hush_camera_handle);

      hush_camera_handle.mode = 'sequence';
      hush_camera_handle.ondataavailable = please_encrypt;
      hush_camera_handle.start(1000); /* TODO sample every n milliseconds */
  }

  camera_works(document.capturestream);
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

function
hush_camera_pause()
{
    try { hush_camera_handle.pause(); } catch (e) {}
}

function
hush_camera_resume()
{
    try { hush_camera_handle.resume(); } catch (e) {}
}

/*
 * Call with $('#friends') or $('#myface')
 */
export function
hush_new_feed(where, id)
{
    //FIXME, this is video specific, see hush_new_pipe above
    console.log('getting feed: ', where, id);
    // id can be type of feed to? so video_high, video_low, audio, filereceiver, etc.
    
    if (! id.startsWith("video_high") ){
      console.log("not implemented feed: " + id);
      throw "feed type not implemented: "
    }
    
    if ( where.querySelector("#div_" + id) ) {
      console.log("existing feed, returning");
      console.log('this should be the feed div (id="' + id + ' ")', where.querySelector("#div_"+id));
      return where.querySelector("#div_" + id);
    } else { // new feed
      // this is the div in the userdiv
      const div = document.createElement('fieldset');
      div.setAttribute('id', "div_" + id);
      div.setAttribute('class', "div_video_high");
      let title = document.createElement('legend');
      title.textContent = "video_high: " + id;
      div.appendChild(title);
	const vid = document.createElement('video');
	vid.setAttribute('id', id);
	div.appendChild(vid);

	function set_source(video) {
	    let m_source = new MediaSource();
	    m_source.mode = 'segments';
	    m_source.addEventListener(
		'sourceopen',
		e => {
		    console.log('m_source:sourceopen', e);
		    /* TODO hardcoding the codec here sucks */
		    vid.buf = m_source.addSourceBuffer(HUSH_CODEC);
		}, {once: true, passive:true});
	    m_source.addEventListener(
		'sourceended', e => {
		    console.log('sourceended:', m_source, e);
		}, {once: true, passive:true});
	    video.src = URL.createObjectURL(m_source);
	}

	/*
	 * When it errors we try again:
	 */
	vid.addEventListener(
	    'error',
	    (e) => {
		console.log('new video source because video erred', vid);
		set_source(vid);
	    }, {once: true, passive:true});
	// FIXME: readonly property vid.buffered = false; /* TODO */

	/*
	 * Trigger error to make sure we have a source ready:
	 */
	set_source(vid);
	try { vid.play(); } catch (e){
	    console.log('play fail', vid, e);
	}

	where.appendChild(div);

	try { vid.play(); }
	catch(e){ console.log('vid.play() did not fly', vid); }
	vid.autoplay = true;
	vid.controls = true;
	console.log('this should be the feed div (id="div_video_high")', div)
      return div;
    }
}


