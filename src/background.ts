/**
 * ClipStaff Background Service Worker
 * Handles extension-level events and side-panel orchestration.
 */

console.log('ClipStaff background active');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ClipStaff extension installed');
});



// Listen for toolbar action click and send message to content script to toggle sidebar
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch((err) => {
      console.log('Cannot toggle sidebar on this page:', err.message);
    });
  }
});

// Listen for messages that need background context
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'HEARTBEAT') {
    sendResponse({ status: 'alive' });
    return true;
  }
  
  if (message.type === 'PING') {
    sendResponse({ status: 'ready' });
    return true;
  }

  if (message.type === 'FETCH_SPREADSHEET') {
    fetch(message.url, { credentials: 'omit', mode: 'cors' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.text();
      })
      .then(text => {
        sendResponse({ success: true, data: text });
      })
      .catch(err => {
        console.error('Background fetch failed:', err);
        sendResponse({ success: false, error: err.message || err.toString() });
      });
    return true; // Keep message channel open for async response
  }
});
