
const isDebug = true

if (isDebug) var debug = console.log.bind(window.console)
else var debug = function(){}

var warn = console.log.bind(window.console)

export const DATACHAN_CONF = {
  ordered: false, 
  maxRetransmits: 0,
//  maxPacketLifeTime: null,
  protocol: "",
//  negotiated: false,
};


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


