import * as utils from "./utils.js"
const isDebug = true

if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)

export const DEFAULTS = {
  TYPE: 'audio',
  MIMETYPE: 'audio/webm;codecs=opus',
  REC_MS: 10,
  RECOPT: { 
        audioBitsPerSecond :  64000,
	      //videoBitsPerSecond : 2500000,
	      //bitsPerSecond:       2628000,
	      mimeType : 'audio/webm;codecs=opus',
 	    }
}

export function common_create_receiver(t) {
  // datachannel stats  
  let cstats = document.createElement('pre');
  var br = document.createTextNode("");
  cstats.appendChild(br);
  t.elem.appendChild(cstats);
  window.setInterval(function () { utils.rendercstats(cstats, t.channel); }, 2000);

  console.log('t', t); 
  t.channel.addEventListener("close", function () { destroy_receiver(t) });
  t.channel.addEventListener("closing", function () { destroy_receiver(t) });
  t.elem.destroy = function () { destroy_receiver(t) };

  utils.formel('checkbox', t.elem, t.NAME + '_receiver_close', function () { destroy_receiver(t); });
  utils.formel('checkbox', t.elem, t.NAME + '_receiver_mute', function () { destroy_receiver(t); });
 let title = document.createElement('legend');
  title.textContent = t.NAME + "_receiver";
  t.elem.appendChild(title);



return;
}

export function common_create_sender(t) {
  utils.formel('checkbox', t.elem, t.NAME + '_sender_close', function () { destroy_sender(t); });
  utils.formel('checkbox', t.elem, t.NAME + '_sender_mute', function () { mute_sender(t); });

  // datachannel stats  
  let cstats = document.createElement('pre');
  var br = document.createTextNode(" stats here\n");
  cstats.appendChild(br);
  t.elem.appendChild(cstats);
  window.setInterval(function () { utils.rendercstats(cstats, t.channel); }, 2000);

  let title = document.createElement('legend');
  title.textContent = t.NAME + "_sender";
  t.elem.appendChild(title);


return;
}

export const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,
};

export function cleanup(t) {
 console.log('datachannel was closed', t.channel);
 if (t.elem) {
  console.log('t.elem: ', t.elem);
   try {
  t.elem.parentNode.removeChild(t.elem);
   } catch (e) {
     console.log('removing t.elem failed', e);
   }
 } else {
  console.log('t.elem: ', t.elem);
 }
}


export function destroy_receiver(t) {
  console.log('destroying receiver');
  t.channel.close();
  console.log('chan: ', t.channel);
  cleanup(t)
}

export function destroy_sender(t) {
  console.log('destroying sender');
  t.channel.close();
  console.log('chan: ', t.channel);
  cleanup(t)
}



// Callback function that executes when this modules state was deleted
const mutation_callback = function(mutationsList, observer) {
    // Use traditional 'for loops' for IE 11
    for(let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            debug('A child node has been added or removed.');
        }
        else if (mutation.type === 'attributes') {
            debug('The ' + mutation.attributeName + ' attribute was modified.');
        } else {
            debug(mutation);
        }
    }
};

export function create_observer(elem) {
  const observer = new MutationObserver(mutation_callback);
  observer.observe(status_el, {
    childList: false,
    attributes: false,
    subtree: false
  });

}
//////////////////////////////////////
//

// gets called when dom element dissapears
function teardown_callback(ctx) {
  return;
}


