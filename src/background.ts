/**
 * ClipStaff Background Service Worker
 * Handles extension-level events, side-panel orchestration, and background triggers.
 */

import { addJob, getPendingJobs, markJobsAsSynced, markJobsAsError, markJobsAsFailed, mergeExternalJobs } from './lib/db';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, isValidJobUrl } from './lib/extractor';
import { Job, Profile } from './types';

console.log('ClipStaff background active');

// Helper: fetch with AbortController timeout
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function updateShortcutCache() {
  try {
    chrome.commands.getAll((commands) => {
      const saveJobCmd = commands.find(c => c.name === 'save-current-job');
      if (saveJobCmd && saveJobCmd.shortcut) {
        chrome.storage.local.set({ activeSaveShortcut: saveJobCmd.shortcut }, () => {
          // Broadcast to all tabs
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'UPDATE_SAVE_SHORTCUT',
                  shortcut: saveJobCmd.shortcut
                }).catch(() => {});
              }
            });
          });
        });
        console.log('Saved active save-job shortcut to storage and broadcasted:', saveJobCmd.shortcut);
      }
    });
  } catch (e) {
    console.error('Failed to get commands:', e);
  }
}

// Add onChanged listener to command and storage changes
if (typeof chrome !== 'undefined' && chrome.commands && (chrome.commands as any).onChanged) {
  (chrome.commands as any).onChanged.addListener((command: any) => {
    if (command.name === 'save-current-job') {
      updateShortcutCache();
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SW] ClipStaff extension installed');
  
  // Register context menu for saving current job
  chrome.contextMenus.create({
    id: 'save-job-to-clipstaff',
    title: 'Save Job to ClipStaff',
    contexts: ['page']
  }, () => {
    if (chrome.runtime.lastError) {
      console.log('Context menu registration warning:', chrome.runtime.lastError.message);
    }
  });

  // Setup periodic sync alarms (Phase 1.4)
  chrome.alarms.create("keep-alive", { periodInMinutes: 4 });
  chrome.alarms.create("sheet-poll-periodic", { periodInMinutes: 15 });
});

// Alarm trigger listener
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log(`[SW Alarm] Alarm fired: ${alarm.name}`);
  if (alarm.name === 'keep-alive') {
    console.log('[SW Keep Alive] Fired at:', new Date().toISOString());
  } else if (alarm.name === 'sync-push-retry') {
    handleBatchPushUpload(false).catch(err => console.error('[SW Alarm] sync-push-retry failed:', err));
  } else if (alarm.name === 'sheet-poll-periodic') {
    handleSheetSyncPoll(false).catch(err => console.error('[SW Alarm] sheet-poll-periodic failed:', err));
  }
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

  if (message.type === 'SAVE_CURRENT_JOB_VIA_SHORTCUT') {
    if (_sender.tab) {
      handleSaveJob(_sender.tab, message.url);
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'TRIGGER_BATCH_PUSH') {
    handleBatchPushUpload(message.force || false)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'TRIGGER_SHEET_POLL') {
    handleSheetSyncPoll(message.force || false)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_SYNC_STATE') {
    chrome.storage.local.get(['isSyncInProgress', 'lastSyncAttempt', 'pendingSyncCount', 'lastSheetVersion'], (res) => {
      sendResponse(res);
    });
    return true;
  }
});

async function ensureActiveTabPermission(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.permissions) {
      resolve();
      return;
    }
    chrome.permissions.contains({ permissions: ['activeTab'] }, (hasIt) => {
      if (hasIt) {
        resolve();
      } else {
        chrome.permissions.request({ permissions: ['activeTab'] }, (granted) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (granted) {
            resolve();
          } else {
            reject(new Error('Permission denied'));
          }
        });
      }
    });
  });
}

function getActiveTabWithTimeout(timeoutMs = 2000): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Tab query timed out'));
    }, timeoutMs);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!tabs || tabs.length === 0) {
        reject(new Error('No active tab found'));
      } else {
        resolve(tabs[0]);
      }
    });
  });
}

async function handleSaveJob(tab: chrome.tabs.Tab, urlOverride?: string) {
  let targetTab = tab;
  let url = urlOverride;

  const showFeedback = (tabId: number | undefined, msg: string, isErr = false) => {
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_PAGE_TOAST',
        message: msg,
        isError: isErr
      }).catch((err) => {
        console.warn('ClipStaff: Failed to send toast message:', err.message);
      });
    }
  };

  try {
    // 1. Request activeTab permission explicitly
    try {
      await ensureActiveTabPermission();
    } catch (e: any) {
      showFeedback(targetTab.id, `Permission denied: ${e.message || 'Active tab access required'}`, true);
      return;
    }

    // 2. Retrieve URL with timeout
    if (!url) {
      if (!targetTab || !targetTab.url) {
        try {
          const activeTab = await getActiveTabWithTimeout(2000);
          targetTab = activeTab;
          url = activeTab.url;
        } catch (e: any) {
          throw new Error(`No URL available: ${e.message || 'Failed to query active tab'}`);
        }
      } else {
        url = targetTab.url;
      }
    }

    if (!url) {
      throw new Error('No URL available');
    }

    // 3. Validate URL
    if (!isValidJobUrl(url)) {
      throw new Error('Invalid job URL');
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

    // 4. Save to database
    try {
      await addJob(jobItem);
      console.log('Saved job to IndexedDB from background:', jobItem);
      
      // Broadcast DB change to sidebar if it's open
      chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' }).catch(() => {});

      // Show success toast
      showFeedback(targetTab.id, `Saved ${role} at ${company}!`, false);
    } catch (dbErr: any) {
      if (dbErr.message === 'Already saved') {
        throw new Error('Already saved');
      } else {
        throw new Error(`Database error: ${dbErr.message || 'Failed to write to database'}`);
      }
    }
  } catch (err: any) {
    console.error('Failed to save job in background:', err);
    showFeedback(targetTab.id, err.message || 'Failed to save job', true);
  }
}

/**
 * Sync state management and helper functions for Background Sync (Phase 1.4)
 */

interface PersistedState {
  state?: {
    googleWebAppUrl?: string;
    activeProfile?: Profile | null;
  }
}

async function getPersistedStore(): Promise<{ googleWebAppUrl: string; activeProfile: Profile | null }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['clipstaff-storage'], (result) => {
      const dataStr = result['clipstaff-storage'];
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr) as PersistedState;
          if (parsed && parsed.state) {
            resolve({
              googleWebAppUrl: parsed.state.googleWebAppUrl || '',
              activeProfile: parsed.state.activeProfile || null
            });
            return;
          }
        } catch (e) {
          console.error('[SW] Failed to parse clipstaff-storage:', e);
        }
      }
      resolve({ googleWebAppUrl: '', activeProfile: null });
    });
  });
}

async function acquireSyncLock(): Promise<boolean> {
  const now = Date.now();
  return new Promise((resolve) => {
    chrome.storage.local.get(['isSyncInProgress', 'lastSyncAttempt'], (result) => {
      const inProgress = result.isSyncInProgress || false;
      const lastAttempt = result.lastSyncAttempt || 0;
      
      // Expire locks older than 10 minutes
      if (inProgress && (now - lastAttempt > 10 * 60 * 1000)) {
        console.log('[SW Sync Lock] Resetting expired sync lock.');
        chrome.storage.local.set({ isSyncInProgress: true, lastSyncAttempt: now }, () => resolve(true));
      } else if (!inProgress) {
        chrome.storage.local.set({ isSyncInProgress: true, lastSyncAttempt: now }, () => resolve(true));
      } else {
        resolve(false);
      }
    });
  });
}

async function releaseSyncLock(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ isSyncInProgress: false }, () => resolve());
  });
}

function showSyncNotification(title: string, message: string, requireRetryButton = false) {
  if (typeof chrome !== 'undefined' && chrome.notifications) {
    const options: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon128.png', // extension package root relative path
      title,
      message,
      priority: 2
    };
    if (requireRetryButton) {
      options.buttons = [{ title: 'Retry Now' }];
    }
    chrome.notifications.create('sync-status-notification', options as any);
  }
}

// Handle notification button click for "Retry Now"
if (typeof chrome !== 'undefined' && chrome.notifications) {
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (notificationId === 'sync-status-notification' && buttonIndex === 0) {
      console.log('[SW Sync] User clicked Retry Now button.');
      handleBatchPushUpload(true).catch(err => console.error('[SW Sync] Manual retry trigger failed:', err));
    }
  });
}

function broadcastSyncStatus(status: 'synced' | 'syncing' | 'error') {
  chrome.runtime.sendMessage({ type: 'SYNC_STATUS_CHANGED', status }).catch(() => {});
  chrome.storage.local.get(['clipstaff-storage'], (result) => {
    const dataStr = result['clipstaff-storage'];
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && parsed.state) {
          parsed.state.syncStatus = status;
          chrome.storage.local.set({ 'clipstaff-storage': JSON.stringify(parsed) });
        }
      } catch (e) {}
    }
  });
}

async function handleBatchPushUpload(forceSync = false) {
  const isAcquired = forceSync ? true : await acquireSyncLock();
  if (!isAcquired) {
    console.log('[SW Sync] Sync is already in progress. Skipping execution.');
    return;
  }

  try {
    const pendingJobs = await getPendingJobs();
    
    // Auto-mark jobs that reached 5 retries as failed
    const failedJobs = pendingJobs.filter(j => (j.retryCount || 0) >= 5);
    if (failedJobs.length > 0) {
      const failedIds = failedJobs.map(j => j.id);
      await markJobsAsFailed(failedIds);
      console.log(`[SW Sync] Set sync state to failed for ${failedIds.length} jobs (retryCount >= 5).`);
    }

    const eligibleJobs = pendingJobs.filter(j => {
      if ((j.retryCount || 0) >= 5) return false;
      if (!j.lastRetryAt) return true;
      const backoffMs = 30 * 1000 * Math.pow(2, j.retryCount || 0);
      return Date.now() - j.lastRetryAt > backoffMs;
    });

    if (eligibleJobs.length === 0) {
      await releaseSyncLock();
      
      const remainingRetries = pendingJobs.filter(j => (j.retryCount || 0) < 5);
      if (remainingRetries.length > 0) {
        const nextTime = Math.min(...remainingRetries.map(j => {
          const delay = 30 * 1000 * Math.pow(2, j.retryCount || 0);
          return (j.lastRetryAt || 0) + delay;
        }));
        const delayMin = Math.max(0.1, (nextTime - Date.now()) / (60 * 1000));
        chrome.alarms.create("sync-push-retry", { delayInMinutes: delayMin });
      } else {
        broadcastSyncStatus('synced');
      }
      return;
    }

    broadcastSyncStatus('syncing');
    const store = await getPersistedStore();
    const googleWebAppUrl = store.googleWebAppUrl;
    const activeProfile = store.activeProfile;

    if (!googleWebAppUrl || !googleWebAppUrl.trim()) {
      console.warn('[SW Sync] Google Web App URL not configured.');
      await markJobsAsError(eligibleJobs.map(j => j.id));
      showSyncNotification('Sync Error', 'Google Sheets Web App URL is not configured.', false);
      broadcastSyncStatus('error');
      await releaseSyncLock();
      return;
    }

    const profileName = activeProfile?.full_name || 'Default_Profile';
    const sanitizedName = profileName.replace(/[\\\/?:*\[\]\s]/g, '_').slice(0, 31).trim();

    // Chunk size: 50
    const chunkSize = 50;
    let totalSynced = 0;
    let hasFailures = false;
    let lastErrorMsg = 'Unknown error';

    await chrome.storage.local.set({ pendingSyncCount: pendingJobs.length });

    for (let i = 0; i < eligibleJobs.length; i += chunkSize) {
      const chunk = eligibleJobs.slice(i, i + chunkSize);
      
      try {
        const chunkPromise = fetchWithTimeout(googleWebAppUrl.trim(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'batch_upload',
            profileName: sanitizedName,
            jobs: chunk.map(j => ({
              id: j.id,
              company: j.company,
              role: j.role,
              url: j.url,
              status: j.status,
              dateAdded: j.dateAdded
            }))
          }),
          redirect: 'follow'
        }, 30000); // 30s timeout per batch request

        const response = await chunkPromise;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        if (result && result.success) {
          const chunkIds = chunk.map(j => j.id);
          await markJobsAsSynced(chunkIds);
          totalSynced += chunk.length;
          
          if (result.version) {
            await chrome.storage.local.set({ lastSheetVersion: result.version });
          }
        } else {
          throw new Error(result?.error || 'Google Apps Script returned success=false');
        }
      } catch (chunkErr: any) {
        hasFailures = true;
        lastErrorMsg = chunkErr.message || 'Network error';
        console.error(`[SW Sync] Chunk failed (${i} to ${i + chunk.length}):`, chunkErr);
        await markJobsAsError(chunk.map(j => j.id));
      }
    }

    const remainingPending = await getPendingJobs();
    await chrome.storage.local.set({ pendingSyncCount: remainingPending.length });

    if (hasFailures) {
      broadcastSyncStatus('error');
      showSyncNotification('Sync Failed', `Some jobs failed to sync: ${lastErrorMsg}`, true);
      
      const remainingErrors = remainingPending.filter(j => (j.retryCount || 0) < 5);
      if (remainingErrors.length > 0) {
        chrome.alarms.create("sync-push-retry", { delayInMinutes: 1 });
      }
    } else {
      broadcastSyncStatus('synced');
      if (totalSynced > 0) {
        showSyncNotification('Sync Complete', `Successfully synced ${totalSynced} job(s) to Google Sheets.`, false);
      }
    }

    chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' }).catch(() => {});

  } catch (err: any) {
    console.error('[SW Sync] Sync process crashed:', err);
    broadcastSyncStatus('error');
    showSyncNotification('Sync Error', `Sync process error: ${err.message || err}`, true);
  } finally {
    await releaseSyncLock();
  }
}

async function handleSheetSyncPoll(force = false) {
  const now = Date.now();
  
  if (!force) {
    const res = await new Promise<{ lastPollTime?: number }>(resolve => {
      chrome.storage.local.get(['lastPollTime'], resolve);
    });
    const lastPoll = res.lastPollTime || 0;
    if (now - lastPoll < 60 * 1000) {
      console.log('[SW Poll] Rate limited. Skipping poll.');
      return;
    }
  }

  await chrome.storage.local.set({ lastPollTime: now });

  const store = await getPersistedStore();
  const googleWebAppUrl = store.googleWebAppUrl;
  if (!googleWebAppUrl || !googleWebAppUrl.trim()) {
    console.log('[SW Poll] Sync URL not configured. Polling skipped.');
    return;
  }

  try {
    const cbUrlVersion = `${googleWebAppUrl.trim()}?action=get_version&_cb=${now}`;
    const versionRes = await fetchWithTimeout(cbUrlVersion, { method: 'GET' }, 10000);
    if (!versionRes.ok) {
      throw new Error(`HTTP version check failed with status ${versionRes.status}`);
    }
    const versionData = await versionRes.json();
    if (!versionData || !versionData.success) {
      throw new Error(versionData?.error || 'Failed to fetch version');
    }

    const newVersion = versionData.version;
    const { lastSheetVersion } = await new Promise<{ lastSheetVersion?: number }>(resolve => {
      chrome.storage.local.get(['lastSheetVersion'], resolve);
    });

    if (lastSheetVersion !== undefined && newVersion <= lastSheetVersion) {
      console.log(`[SW Poll] Local sheet version (${lastSheetVersion}) is up to date with remote (${newVersion}).`);
      return;
    }

    console.log(`[SW Poll] Sheet update found. Local version: ${lastSheetVersion}, Remote version: ${newVersion}. Fetching jobs...`);
    
    const cbUrlJobs = `${googleWebAppUrl.trim()}?action=get_jobs&_cb=${now}`;
    const jobsRes = await fetchWithTimeout(cbUrlJobs, { method: 'GET' }, 20000);
    if (!jobsRes.ok) {
      throw new Error(`HTTP jobs fetch failed with status ${jobsRes.status}`);
    }
    const jobsData = await jobsRes.json();
    if (!jobsData || !jobsData.success) {
      throw new Error(jobsData?.error || 'Failed to fetch jobs data');
    }

    const remoteJobs = jobsData.jobs || [];
    
    const addedAny = await mergeExternalJobs(remoteJobs);
    
    await chrome.storage.local.set({ lastSheetVersion: newVersion });
    
    if (addedAny) {
      chrome.runtime.sendMessage({ type: 'JOB_DATABASE_CHANGED' }).catch(() => {});
      console.log(`[SW Poll] Merged remote changes. Local database updated.`);
    }

  } catch (err: any) {
    console.error('[SW Poll] Delta polling failed:', err);
  }
}

// SW Startup check: Resume sync for remaining pending jobs
chrome.storage.local.get(['pendingSyncCount'], (res) => {
  const count = res.pendingSyncCount || 0;
  if (count > 0) {
    console.log(`[SW Startup] Resuming sync for ${count} pending jobs.`);
    chrome.alarms.create("sync-push-retry", { delayInMinutes: 0.1 });
  }
});

