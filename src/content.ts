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
  
  // Match the last word before the cursor (any non-whitespace sequence)
  const match = text.match(/(\S+)$/);
  
  if (!match) return;

  const shortcut = match[1].toLowerCase();
  const expandedText = shortcutCache[shortcut];

  if (expandedText) {
    // 1. Prevent the trigger key (Space/Enter) from being typed before expansion
    event.preventDefault();

    // 2. Identify the replacement range
    const start = cursor - shortcut.length;
    const end = cursor;

    // 3. Perform the replacement
    element.focus();
    element.setSelectionRange(start, end);
    
    const replacement = expandedText + (event.key === 'Enter' ? '' : ' ');
    
    // Try execCommand first (better for React/Vue undo stacks)
    const success = document.execCommand('insertText', false, replacement);
    
    if (!success) {
      // Fallback for browsers/elements that don't support execCommand
      element.setRangeText(replacement, start, end, 'end');
    }
    
    // 4. Dispatch events for React/Vue compatibility
    ['input', 'change', 'blur'].forEach(type => {
      element.dispatchEvent(new Event(type, { bubbles: true }));
    });

    console.log('ClipStaff: Expanded', shortcut);
  }
}
