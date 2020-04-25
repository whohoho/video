'use strict';
import * as utils from "./utils.js";
export const NAME = 'chat';
const isDebug = true

if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)


const TYPE = 'chat'

export function create_duplex(status_el, channel, encryptor, decryptor) {

  // local log
  let loge = document.createElement('pre');
  status_el.appendChild(loge);

  function log (msg)  {
    for (var i = 0, j = arguments.length; i < j; i++){
       // var txt = document.createTextNode(arguments[i]+' ');
       // loge.appendChild(txt);
        var alltext =alltext + arguments[i]+ ' -- ';
    }
    var br = document.createTextNode(alltext + "\n");
    loge.appendChild(br);
  }

  // datachannel stats
   let cstats = document.createElement('pre');
  var br = document.createTextNode(" stats here\n");
  cstats.appendChild(br);
  status_el.appendChild(cstats);
  window.setInterval(utils.rendercstats(cstats, channel), 2000);
 
  //let log = (status_el) => (msg) => local_log(status_el, msg);
  
  const t = {
    log: log,
    status_el: status_el,
    encryptor: encryptor,
    channel: channel,
    status_el: status_el,
  };
  log('chan in create_sender: ', channel, t);
  log('cryp in create_sender: ', encryptor);

  let title = document.createElement('legend');
  title.textContent = NAME;
  status_el.appendChild(title);
}


