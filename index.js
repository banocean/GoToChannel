
const script = document.createElement('script');
script.src = chrome.runtime.getURL('modules/runMain.js');
document.head.appendChild(script);
