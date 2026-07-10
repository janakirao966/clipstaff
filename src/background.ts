/**
 * ClipStaff Background Service Worker
 * Handles extension-level events, side-panel orchestration, and background triggers.
 */

import { addJob } from './lib/db';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, isValidJobUrl } from './lib/extractor';
import { Job } from './types';

console.log('ClipStaff background active');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ClipStaff extension installed');
  
  // Register context menu for saving current job
  chrome.contextMenus.create({
    id: 'save-job-to-clipstaff',
    title: 'Save Job to ClipStaff',
    contexts: ['page']
  }, () => {
    if (chrome.runtime.lastError) {
      console.log('Context menu registration warning:', chrome.runtime.lastError.message);
    } else {
      console.log('Context menu registered successfully');
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-job-to-clipstaff' && tab) {
    handleSaveJob(tab);
  }
});

// Handle keyboard command shortcut
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'save-current-job' && tab) {
    handleSaveJob(tab);
  }
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

  if (message.type === 'FETCH_SPREADSHEET_BINARY') {
    fetch(message.url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.arrayBuffer();
      })
      .then(buffer => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
          binary += String.fromCharCode(...chunk);
        }
        sendResponse({ success: true, data: btoa(binary) });
      })
      .catch(err => {
        console.error('Background binary fetch failed:', err);
        sendResponse({ success: false, error: err.message || err.toString() });
      });
    return true;
  }

  if (message.type === 'POST_API') {
    fetch(message.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message.body),
      redirect: 'follow'
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(json => {
        sendResponse({ success: true, data: json });
      })
      .catch(err => {
        console.error('Background POST failed:', err);
        sendResponse({ success: false, error: err.message || err.toString() });
      });
    return true; // Keep message channel open for async response
  }
});

async function handleSaveJob(tab: chrome.tabs.Tab) {
  if (!tab.url) return;
  
  const url = tab.url;
  
  if (!isValidJobUrl(url)) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'SHOW_PAGE_TOAST', 
        message: `Ignored: Not a valid job page!`
      }).catch(() => {});
    }
    return;
  }
  
  const company = extractCompanyFromUrl(url);
  const role = extractRoleFromUrl(url);
  const id = getJobId(url);
  const dateAdded = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const jobItem: Job = {
    id,
    company,
    role,
    url,
    dateAdded,
    status: 'not_applied'
  };

  try {
    await addJob(jobItem);
    console.log('Saved job to IndexedDB from background:', jobItem);
    
    // Broadcast DB change to sidebar if it's open
    chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' }).catch(() => {
      // Sidebar might not be open, that's fine
    });

    // Notify active tab's content script to show a toast message
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'SHOW_PAGE_TOAST', 
        message: `Saved ${role} at ${company}!`
      }).catch((err) => {
        console.log('Cannot show page toast on this page:', err.message);
      });
    }
  } catch (err: any) {
    console.error('Failed to save job in background:', err);
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'SHOW_PAGE_TOAST', 
        message: `Error: ${err.message || 'Failed to save job'}`
      }).catch(() => {});
    }
  }
}
