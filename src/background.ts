import { supabase } from './lib/supabase';

console.log('ClipStaff background script loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('ClipStaff extension installed');
});

// Setup side panel behavior

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Message Proxy & Data Sync
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // 1. Proxy: Sidebar -> Content Script
  if (message.target === 'content-script') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, message.data, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: 'Could not reach content script. Refresh the page.' });
          } else {
            sendResponse(response);
          }
        });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; 
  }

  // 2. Data Sync: Content Script -> Background
  if (message.type === 'SYNC_DATA') {
    handleDataSync().then(sendResponse);
    return true;
  }
});

async function handleDataSync() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Fetch snippets
    const { data: snippets } = await supabase
      .from('snippets')
      .select('shortcut, text')
      .eq('user_id', user.id);

    // Fetch active profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name, email, phone, linkedin_url, portfolio_url, location, visa_status, notice_period')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    const activeProfile = profiles?.[0];
    const shortcuts: Record<string, string> = {};

    // Populate from snippets
    snippets?.forEach(s => {
      shortcuts[s.shortcut.toLowerCase()] = s.text;
    });

    // Populate from profile fields
    if (activeProfile) {
      if (activeProfile.full_name) shortcuts['name'] = activeProfile.full_name;
      if (activeProfile.email) shortcuts['email'] = activeProfile.email;
      if (activeProfile.phone) shortcuts['phone'] = activeProfile.phone;
      if (activeProfile.linkedin_url) shortcuts['li'] = activeProfile.linkedin_url;
      if (activeProfile.portfolio_url) shortcuts['port'] = activeProfile.portfolio_url;
      if (activeProfile.location) shortcuts['loc'] = activeProfile.location;
      if (activeProfile.visa_status) shortcuts['visa'] = activeProfile.visa_status;
      if (activeProfile.notice_period) shortcuts['notice'] = activeProfile.notice_period;
    }

    return { shortcuts };
  } catch (err) {
    console.error('Sync error:', err);
    return { error: 'Failed to sync data' };
  }
}
