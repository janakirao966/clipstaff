/**
 * ClipStaff Content Script
 * Handles DOM interaction and text expansion in the active tab.
 */

let shortcutCache: Record<string, string> = {};

const syncData = () => {
  chrome.runtime.sendMessage({ type: 'SYNC_DATA' }, (response) => {
    if (response?.shortcuts) {
      shortcutCache = response.shortcuts;
      console.log('ClipStaff: Cache Synced', Object.keys(shortcutCache).length, 'shortcuts');
    }
  });
};

// Initial sync
syncData();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    syncData();
    sendResponse({ status: 'ready' });
    return true;
  }
  
  if (message.type === 'SYNC_DATA') {
    if (message.data?.shortcuts) {
      shortcutCache = message.data.shortcuts;
    }
    return true;
  }
});

// Expansion Logic
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable;

  if (!isInput && !isContentEditable) return;

  // Trigger expansion on Space or Enter
  if (event.key === ' ' || event.key === 'Enter') {
    handleExpansion(target, event);
  }
}, true);

async function handleExpansion(element: HTMLElement, event: KeyboardEvent) {
  let text = '';
  let cursor = 0;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    cursor = element.selectionStart || 0;
    text = element.value.slice(0, cursor);
  } else if (element.isContentEditable) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    // We only support expansion at the end of text nodes for now
    if (range.startContainer.nodeType !== Node.TEXT_NODE) return;
    
    text = range.startContainer.textContent?.slice(0, range.startOffset) || '';
    cursor = range.startOffset;
  }

  // Match the last word before the cursor
  const match = text.match(/(\S+)$/);
  if (!match) return;

  const shortcut = match[1].toLowerCase();
  const expandedText = shortcutCache[shortcut];

  if (expandedText) {
    console.log('ClipStaff: Expanding', shortcut);
    event.preventDefault();

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = cursor - shortcut.length;
      const end = cursor;
      
      element.focus();
      element.setSelectionRange(start, end);
      
      const replacement = expandedText + (event.key === 'Enter' ? '' : ' ');
      const success = document.execCommand('insertText', false, replacement);
      
      if (!success) {
        element.setRangeText(replacement, start, end, 'end');
      }

      ['input', 'change', 'blur'].forEach(type => {
        element.dispatchEvent(new Event(type, { bubbles: true }));
      });
    } else if (element.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      
      // Move range back to start of shortcut
      range.setStart(range.startContainer, cursor - shortcut.length);
      range.setEnd(range.startContainer, cursor);
      range.deleteContents();
      
      const replacement = expandedText + (event.key === 'Enter' ? '' : ' ');
      const textNode = document.createTextNode(replacement);
      range.insertNode(textNode);
      
      // Move cursor to end
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
