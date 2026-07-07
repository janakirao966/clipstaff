/**
 * ClipStaff Content Script - Live Expansion Edition
 */

import { initSpotlight } from './lib/spotlight';

let shortcutCache: Record<string, string> = {};
let lastFocusedInput: HTMLElement | null = null;

document.addEventListener('focusin', (e) => {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    lastFocusedInput = target;
  }
});

// Load from storage on init
const loadCacheFromStorage = () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['clipstaff_shortcuts'], (result) => {
      if (result.clipstaff_shortcuts) {
        shortcutCache = result.clipstaff_shortcuts;
        console.log('ClipStaff: Live Cache Ready', Object.keys(shortcutCache).length, 'keys');
      }
    });
  }
};

// Listen for storage changes
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.clipstaff_shortcuts) {
      shortcutCache = changes.clipstaff_shortcuts.newValue || {};
      console.log('ClipStaff: Live Cache Updated');
    }
  });
}

loadCacheFromStorage();

// --- Injected Sidebar Iframe & Floating Toggle Button ---

const iframe = document.createElement('iframe');
iframe.src = chrome.runtime.getURL('index.html');
iframe.id = 'clipstaff-sidebar-iframe';
iframe.setAttribute('allow', 'clipboard-write');
iframe.style.cssText = `
  position: fixed !important;
  top: 0 !important;
  right: -420px !important;
  width: 400px !important;
  height: 100vh !important;
  z-index: 2147483646 !important;
  border: none !important;
  background: transparent !important;
  transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5) !important;
  color-scheme: dark !important;
`;

const toggleBtn = document.createElement('button');
toggleBtn.id = 'clipstaff-sidebar-toggle';
toggleBtn.style.cssText = `
  position: fixed !important;
  right: 0 !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 36px !important;
  height: 48px !important;
  background: #0A0A0A !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-right: none !important;
  border-radius: 12px 0 0 12px !important;
  cursor: pointer !important;
  z-index: 2147483647 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s !important;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3) !important;
  padding: 0 !important;
  margin: 0 !important;
`;

const logoImg = document.createElement('img');
logoImg.src = chrome.runtime.getURL('public/icons/icon16.png');
logoImg.style.cssText = `
  width: 18px !important;
  height: 18px !important;
  pointer-events: none !important;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
`;
toggleBtn.appendChild(logoImg);

const injectSidebar = () => {
  if (!document.getElementById('clipstaff-sidebar-iframe')) {
    document.body.appendChild(iframe);
    document.body.appendChild(toggleBtn);
  }
};

if (document.body) {
  injectSidebar();
} else {
  window.addEventListener('DOMContentLoaded', injectSidebar);
}

let isSidebarOpen = false;

function toggleSidebar() {
  isSidebarOpen = !isSidebarOpen;
  if (isSidebarOpen) {
    iframe.style.setProperty('right', '0px', 'important');
    toggleBtn.style.setProperty('right', '400px', 'important');
    logoImg.style.setProperty('transform', 'rotate(180deg)', 'important');
  } else {
    iframe.style.setProperty('right', '-420px', 'important');
    toggleBtn.style.setProperty('right', '0px', 'important');
    logoImg.style.setProperty('transform', 'rotate(0deg)', 'important');
  }
}

toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSidebar();
});

// Close or inject text when receiving a postMessage from inside the iframe
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLOSE_CLIPSTAFF_SIDEBAR') {
    if (isSidebarOpen) {
      toggleSidebar();
    }
  }
  if (event.data && event.data.type === 'INJECT_TEXT') {
    injectText(event.data.text);
  }
  if (event.data && event.data.type === 'COPY_TEXT') {
    navigator.clipboard.writeText(event.data.text).catch((err) => {
      console.error('ClipStaff: Content script copy failed', err);
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    loadCacheFromStorage();
    sendResponse({ status: 'ready', shortcutsCount: Object.keys(shortcutCache).length });
    return true;
  }
  if (message.type === 'TOGGLE_SIDEBAR') {
    toggleSidebar();
    sendResponse({ status: 'done' });
    return true;
  }
  if (message.type === 'INJECT_TEXT') {
    injectText(message.text);
    sendResponse({ status: 'done' });
    return true;
  }
  if (message.type === 'SHOW_PAGE_TOAST') {
    showPageToast(message.message);
    sendResponse({ status: 'done' });
    return true;
  }
});

function showPageToast(message: string) {
  const existing = document.getElementById('clipstaff-page-toast');
  if (existing) {
    existing.remove();
  }

  const toastEl = document.createElement('div');
  toastEl.id = 'clipstaff-page-toast';
  toastEl.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    background: #0A0A0A !important;
    color: #F8FAFC !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    padding: 12px 18px !important;
    font-size: 13px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-weight: 500 !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 242, 254, 0.08) !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    pointer-events: none !important;
    transform: translateY(20px) !important;
    opacity: 0 !important;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease !important;
  `;

  const checkIcon = document.createElement('span');
  checkIcon.innerHTML = '✓';
  checkIcon.style.cssText = `
    color: #00F2FE !important;
    font-weight: bold !important;
  `;
  toastEl.appendChild(checkIcon);

  const textEl = document.createElement('span');
  textEl.innerText = message;
  toastEl.appendChild(textEl);

  document.body.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.style.setProperty('transform', 'translateY(0)', 'important');
    toastEl.style.setProperty('opacity', '1', 'important');
  });

  setTimeout(() => {
    toastEl.style.setProperty('transform', 'translateY(10px)', 'important');
    toastEl.style.setProperty('opacity', '0', 'important');
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        toastEl.remove();
      }
    }, 300);
  }, 3000);
}

function injectText(text: string) {
  const el = lastFocusedInput;
  if (el && document.body.contains(el)) {
    el.focus();
    
    let isRestrictedInput = false;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      isRestrictedInput = ['password', 'email', 'number', 'date', 'month', 'week', 'time', 'datetime-local', 'range', 'color'].includes(el.type);
      
      const start = el.value.length;
      let cursorStart = start;
      let cursorEnd = start;
      
      if (!isRestrictedInput) {
        try {
          cursorStart = el.selectionStart || 0;
          cursorEnd = el.selectionEnd || 0;
        } catch (e) {
          isRestrictedInput = true;
        }
      }

      if (isRestrictedInput) {
        // Direct value assignment fallback using React prototype setter
        const nativeSetter = Object.getOwnPropertyDescriptor(
          el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
          'value'
        )?.set;
        
        if (nativeSetter) {
          nativeSetter.call(el, el.value.slice(0, cursorStart) + text + el.value.slice(cursorEnd));
        } else {
          el.value = el.value.slice(0, cursorStart) + text + el.value.slice(cursorEnd);
        }
        
        ['input', 'change'].forEach(type => {
          el.dispatchEvent(new Event(type, { bubbles: true }));
        });
      } else {
        try {
          // Use execCommand to preserve undo/redo history and trigger React bindings
          el.setSelectionRange(cursorStart, cursorEnd);
          const success = document.execCommand('insertText', false, text);
          if (!success) {
            if ('setRangeText' in el) {
              el.setRangeText(text, cursorStart, cursorEnd, 'end');
            } else {
              (el as any).value = (el as any).value.slice(0, cursorStart) + text + (el as any).value.slice(cursorEnd);
            }
            ['input', 'change'].forEach(type => {
              el.dispatchEvent(new Event(type, { bubbles: true }));
            });
          }
        } catch (err) {
          (el as any).value = (el as any).value.slice(0, cursorStart) + text + (el as any).value.slice(cursorEnd);
          ['input', 'change'].forEach(type => {
            el.dispatchEvent(new Event(type, { bubbles: true }));
          });
        }
      }
    } else if (el.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const fragment = document.createDocumentFragment();
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        fragment.appendChild(document.createTextNode(line));
        if (idx < lines.length - 1) {
          fragment.appendChild(document.createElement('br'));
        }
      });
      
      range.insertNode(fragment);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

// Trigger-based expansion on Space, Enter, or Tab keys
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (!target) return;

  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable;

  if (!isInput && !isContentEditable) return;

  // Trigger expansion on Space, Enter, or Tab
  if (event.key === ' ' || event.key === 'Enter' || event.key === 'Tab') {
    handleTriggerExpansion(target, event);
  }
}, true);

async function handleTriggerExpansion(element: HTMLElement, event: KeyboardEvent) {
  let textBeforeCursor = '';
  let cursorPosition = 0;
  let isRestrictedInput = false;

  try {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      isRestrictedInput = ['password', 'email', 'number', 'date', 'month', 'week', 'time', 'datetime-local', 'range', 'color'].includes(element.type);
      
      if (isRestrictedInput) {
        textBeforeCursor = element.value || '';
        cursorPosition = textBeforeCursor.length;
      } else {
        try {
          cursorPosition = element.selectionStart || 0;
          textBeforeCursor = element.value.slice(0, cursorPosition);
        } catch (e) {
          textBeforeCursor = element.value || '';
          cursorPosition = textBeforeCursor.length;
          isRestrictedInput = true;
        }
      }
    } else if (element.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || '';
        cursorPosition = range.startOffset;
      }
    }

    // Match the last word (min 2 chars to avoid accidental single char expansions)
    // The trigger key (Space/Enter/Tab) has not yet been processed by the DOM,
    // so the word immediately before the cursor is at the end of textBeforeCursor.
    const match = textBeforeCursor.match(/(\S{2,})$/);
    if (!match) return;

    const fullWord = match[1];
    const shortcut = fullWord.toLowerCase();
    const expandedText = shortcutCache[shortcut];

    if (expandedText) {
      // Prevent default key action (stop focus loss, raw newline, or duplicate space)
      event.preventDefault();

      // Determine what to insert
      let textToInsert = expandedText;
      if (event.key === ' ') {
        textToInsert += ' ';
      } else if (event.key === 'Enter') {
        if (element instanceof HTMLTextAreaElement || element.isContentEditable) {
          textToInsert += '\n';
        }
      }

      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        const start = cursorPosition - fullWord.length;
        const end = cursorPosition;
        
        element.focus();
        const target = element as HTMLInputElement | HTMLTextAreaElement;

        if (isRestrictedInput) {
          // Direct value assignment fallback using React prototype setter
          const nativeSetter = Object.getOwnPropertyDescriptor(
            target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
            'value'
          )?.set;
          
          if (nativeSetter) {
            nativeSetter.call(target, target.value.slice(0, start) + textToInsert + target.value.slice(end));
          } else {
            target.value = target.value.slice(0, start) + textToInsert + target.value.slice(end);
          }
          
          ['input', 'change'].forEach(type => {
            element.dispatchEvent(new Event(type, { bubbles: true }));
          });
        } else {
          try {
            // Use execCommand first to preserve undo/redo history and trigger React/Angular bindings
            target.setSelectionRange(start, end);
            const success = document.execCommand('insertText', false, textToInsert);
            
            if (!success) {
              if ('setRangeText' in target) {
                target.setRangeText(textToInsert, start, end, 'end');
              } else {
                (target as any).value = (target as any).value.slice(0, start) + textToInsert + (target as any).value.slice(end);
              }
              
              ['input', 'change'].forEach(type => {
                element.dispatchEvent(new Event(type, { bubbles: true }));
              });
            }
          } catch (err) {
            // Safe fallback mutation in case selection APIs fail unexpectedly
            (target as any).value = (target as any).value.slice(0, start) + textToInsert + (target as any).value.slice(end);
            ['input', 'change'].forEach(type => {
              element.dispatchEvent(new Event(type, { bubbles: true }));
            });
          }
        }
      } else if (element.isContentEditable) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        
        range.setStart(range.startContainer, cursorPosition - fullWord.length);
        range.setEnd(range.startContainer, cursorPosition);
        range.deleteContents();
        
        // Parse newlines to text nodes + <br> elements
        const fragment = document.createDocumentFragment();
        const lines = textToInsert.split('\n');
        lines.forEach((line, idx) => {
          fragment.appendChild(document.createTextNode(line));
          if (idx < lines.length - 1) {
            fragment.appendChild(document.createElement('br'));
          }
        });
        
        range.insertNode(fragment);
        
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  } catch (err) {
    console.warn('ClipStaff: Trigger expansion failed', err);
  }
}

// Instant expansion on input (no trigger key required)
document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement;
  if (!target) return;

  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable;

  if (!isInput && !isContentEditable) return;

  handleInstantExpansion(target);
}, true);

async function handleInstantExpansion(element: HTMLElement) {
  let textBeforeCursor = '';
  let cursorPosition = 0;
  let isRestrictedInput = false;

  try {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      isRestrictedInput = ['password', 'email', 'number', 'date', 'month', 'week', 'time', 'datetime-local', 'range', 'color'].includes(element.type);
      
      if (isRestrictedInput) {
        textBeforeCursor = element.value || '';
        cursorPosition = textBeforeCursor.length;
      } else {
        try {
          cursorPosition = element.selectionStart || 0;
          textBeforeCursor = element.value.slice(0, cursorPosition);
        } catch (e) {
          textBeforeCursor = element.value || '';
          cursorPosition = textBeforeCursor.length;
          isRestrictedInput = true;
        }
      }
    } else if (element.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || '';
        cursorPosition = range.startOffset;
      }
    }

    if (!textBeforeCursor) return;

    // Find if the text before cursor ends with any of our shortcut keys
    const cacheKeys = Object.keys(shortcutCache);
    for (const key of cacheKeys) {
      if (textBeforeCursor.toLowerCase().endsWith(key.toLowerCase())) {
        const expandedText = shortcutCache[key];
        if (!expandedText) continue;

        const start = cursorPosition - key.length;
        const end = cursorPosition;

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          element.focus();
          const target = element as HTMLInputElement | HTMLTextAreaElement;

          if (isRestrictedInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
              target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
              'value'
            )?.set;
            
            if (nativeSetter) {
              nativeSetter.call(target, target.value.slice(0, start) + expandedText + target.value.slice(end));
            } else {
              target.value = target.value.slice(0, start) + expandedText + target.value.slice(end);
            }
            
            ['input', 'change'].forEach(type => {
              element.dispatchEvent(new Event(type, { bubbles: true }));
            });
          } else {
            try {
              target.setSelectionRange(start, end);
              const success = document.execCommand('insertText', false, expandedText);
              
              if (!success) {
                if ('setRangeText' in target) {
                  target.setRangeText(expandedText, start, end, 'end');
                } else {
                  (target as any).value = (target as any).value.slice(0, start) + expandedText + (target as any).value.slice(end);
                }
                
                ['input', 'change'].forEach(type => {
                  element.dispatchEvent(new Event(type, { bubbles: true }));
                });
              }
            } catch (err) {
              (target as any).value = (target as any).value.slice(0, start) + expandedText + (target as any).value.slice(end);
              ['input', 'change'].forEach(type => {
                element.dispatchEvent(new Event(type, { bubbles: true }));
              });
            }
          }
        } else if (element.isContentEditable) {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0) return;
          const range = selection.getRangeAt(0);
          
          if (range.startContainer.nodeType === Node.TEXT_NODE) {
            const textNode = range.startContainer;
            const textContent = textNode.textContent || '';
            const newContent = textContent.slice(0, start) + expandedText + textContent.slice(end);
            textNode.textContent = newContent;
            
            const newOffset = start + expandedText.length;
            range.setStart(textNode, newOffset);
            range.setEnd(textNode, newOffset);
            selection.removeAllRanges();
            selection.addRange(range);
            
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        break; // Match found and expanded, stop checking keys
      }
    }
  } catch (err) {
    console.warn('ClipStaff: Instant expansion failed', err);
  }
}

// --- Spotlight Command Bar HUD Overlay ---
initSpotlight(() => shortcutCache);
