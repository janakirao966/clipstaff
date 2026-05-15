/**
 * ClipStaff Content Script
 * Handles DOM interaction and text expansion in the active tab.
 */

console.log('ClipStaff: Content Script Loaded');

let shortcutCache: Record<string, string> = {};

const syncData = () => {
  chrome.runtime.sendMessage({ type: 'SYNC_DATA' }, (response) => {
    if (response?.shortcuts) {
      shortcutCache = response.shortcuts;
      console.log('ClipStaff: Cache Synced', Object.keys(shortcutCache).length, 'shortcuts');
    } else {
      console.error('ClipStaff: Sync failed', response?.error);
    }
  });
};

// Initial sync
syncData();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    console.log('ClipStaff: Received PING from Background');
    // Refresh cache whenever sidebar is active
    syncData();
    sendResponse({ type: 'PONG', status: 'ready' });
    return true;
  }

  if (message.type === 'EXPAND_TEXT') {
    console.log('ClipStaff: Expansion requested', message.data);
    sendResponse({ success: true });
    return true;
  }
});

// Expansion Logic
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  
  // Only monitor standard inputs and textareas
  if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;

  // Trigger expansion on Space or Enter
  if (event.key === ' ' || event.key === 'Enter') {
    handleExpansion(target, event);
  }
}, true);

function handleExpansion(element: HTMLInputElement | HTMLTextAreaElement, event: KeyboardEvent) {
  const cursor = element.selectionStart || 0;
  const text = element.value.slice(0, cursor);
  const match = text.match(/\/(\S+)$/);
  
  if (!match) return;

  const shortcut = match[1].toLowerCase();
  const expandedText = shortcutCache[shortcut];

  if (expandedText) {
    // 1. Prevent the trigger key (Space/Enter) from being typed before expansion
    event.preventDefault();

    // 2. Identify the replacement range
    const start = cursor - (shortcut.length + 1); // +1 for the slash
    const end = cursor;

    // 3. Perform the replacement
    // Using 'end' ensures cursor stays after the new text
    element.setRangeText(expandedText + (event.key === 'Enter' ? '' : ' '), start, end, 'end');

    // 4. Dispatch events for React/Vue compatibility
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    console.log('ClipStaff: Expanded', shortcut);
  }
}
