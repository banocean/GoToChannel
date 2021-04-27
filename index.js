
const script = document.createElement('script');
script.src = chrome.runtime.getURL('modules/test.js');
document.head.appendChild(script);
