/**
 * ClipStaff Content Script - Ultra-Fast Edition
 * Optimized for minimal CPU overhead, zero page load delays, and instant expansion.
 */

import { initSpotlight } from './lib/spotlight';
import { resolveTemplate } from './lib/templateHelper';
import { showHudPrompt } from './lib/hud';
import { extractCompanyFromUrl, extractRoleFromUrl } from './lib/extractor';

const isTopFrame = typeof window !== 'undefined' && window.self === window.top;

let shortcutCache: Record<string, string> = {};
let activeProfileCache: any = null;
let lastFocusedInput: HTMLElement | null = null;
let layoutModeCache = 'overlay';

function getDeepActiveElement(root: Document | ShadowRoot = document): HTMLElement | null {
  const activeEl = root.activeElement as HTMLElement;
  if (!activeEl) return null;
  if (activeEl.shadowRoot) {
    return getDeepActiveElement(activeEl.shadowRoot);
  }
  return activeEl;
}

// Track focused inputs with passive capture listener
document.addEventListener('focusin', () => {
  const target = getDeepActiveElement();
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    lastFocusedInput = target;
  }
}, { passive: true });

// Push-based storage loading
const loadCacheFromStorage = () => {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['clipstaff_shortcuts', 'clipstaff_active_profile', 'clipstaff_layout_mode'], (result) => {
      if (result.clipstaff_shortcuts) {
        shortcutCache = result.clipstaff_shortcuts;
      }
      if (result.clipstaff_active_profile) {
        activeProfileCache = result.clipstaff_active_profile;
      }
      if (result.clipstaff_layout_mode) {
        layoutModeCache = result.clipstaff_layout_mode;
      }
    });
  }
};

// Listen for storage changes push-based (0ms latency, zero polling)
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.clipstaff_shortcuts) {
        shortcutCache = changes.clipstaff_shortcuts.newValue || {};
      }
      if (changes.clipstaff_active_profile) {
        activeProfileCache = changes.clipstaff_active_profile.newValue || null;
      }
      if (changes.clipstaff_layout_mode) {
        layoutModeCache = changes.clipstaff_layout_mode.newValue || 'overlay';
      }
    }
  });
}

// Initial cache load
loadCacheFromStorage();

// ============================================================================
// TOP-FRAME ONLY FEATURES: Sidebar Iframe, HUD, Application Detector
// ============================================================================

if (isTopFrame) {
  // Create shadow host container
  const host = document.createElement('div');
  host.id = 'clipstaff-sidebar-host';
  host.style.cssText = 'all: initial !important; display: block !important; position: fixed !important; top: 0 !important; right: 0 !important; width: 0 !important; height: 0 !important; border: none !important; margin: 0 !important; padding: 0 !important; z-index: 2147483647 !important; overflow: visible !important; pointer-events: none !important;';

  const shadowRoot = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    #clipstaff-sidebar-iframe {
      position: fixed !important;
      top: 0 !important;
      right: -400px !important;
      width: 400px !important;
      height: 100vh !important;
      z-index: 2147483646 !important;
      border: none !important;
      background: transparent !important;
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease !important;
      box-shadow: none !important;
      color-scheme: dark !important;
      pointer-events: auto !important;
    }
    #clipstaff-sidebar-toggle {
      position: fixed !important;
      right: 0 !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      width: 42px !important;
      height: 42px !important;
      background: transparent !important;
      border: none !important;
      border-radius: 12px 0 0 12px !important;
      cursor: pointer !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease !important;
      filter: drop-shadow(-3px 3px 10px rgba(0, 0, 0, 0.45)) !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
      pointer-events: auto !important;
    }
    #clipstaff-sidebar-toggle:hover {
      transform: translateY(-50%) scale(1.08) !important;
      filter: drop-shadow(-4px 4px 14px rgba(228, 242, 34, 0.55)) drop-shadow(-2px 2px 6px rgba(0, 0, 0, 0.5)) !important;
    }
    #clipstaff-sidebar-toggle img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 12px 0 0 12px !important;
      pointer-events: none !important;
      display: block !important;
      border: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;
  shadowRoot.appendChild(style);

  const iframe = document.createElement('iframe');
  iframe.id = 'clipstaff-sidebar-iframe';
  iframe.setAttribute('allow', 'clipboard-write');

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'clipstaff-sidebar-toggle';

  const logoImg = document.createElement('img');
  logoImg.alt = 'ClipStaff';
  logoImg.src = chrome.runtime.getURL('public/logo.webp');
  logoImg.onerror = () => {
    try {
      logoImg.src = chrome.runtime.getURL('logo.webp');
    } catch {
      logoImg.src = chrome.runtime.getURL('public/icons/icon128.png');
    }
  };
  toggleBtn.appendChild(logoImg);

  const injectSidebar = () => {
    if (!(document instanceof HTMLDocument) && document.contentType !== 'text/html') {
      return;
    }

    if (!document.getElementById('clipstaff-sidebar-host')) {
      try {
        iframe.setAttribute('title', 'ClipStaff Sidebar');
        toggleBtn.setAttribute('aria-label', 'Toggle ClipStaff Sidebar');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('role', 'button');
        toggleBtn.setAttribute('tabindex', '0');
        
        toggleBtn.addEventListener('focus', () => {
          toggleBtn.style.setProperty('outline', '2px solid #e4f222', 'important');
          toggleBtn.style.setProperty('outline-offset', '-2px', 'important');
        });
        toggleBtn.addEventListener('blur', () => {
          toggleBtn.style.removeProperty('outline');
          toggleBtn.style.removeProperty('outline-offset');
        });

        shadowRoot.appendChild(iframe);
        shadowRoot.appendChild(toggleBtn);
        document.documentElement.appendChild(host);
      } catch (err) {
        console.warn('ClipStaff: Failed to bootstrap content script:', err);
      }
    }
  };

  if (document.documentElement) {
    injectSidebar();
  } else {
    window.addEventListener('DOMContentLoaded', injectSidebar, { once: true });
  }

  let isSidebarOpen = false;

  const toggleSidebar = () => {
    isSidebarOpen = !isSidebarOpen;
    const body = document.body;
    const mode = layoutModeCache;
    
    toggleBtn.setAttribute('aria-expanded', isSidebarOpen ? 'true' : 'false');
    
    if (isSidebarOpen) {
      if (!iframe.src) {
        iframe.src = chrome.runtime.getURL('index.html');
      }
      iframe.style.setProperty('right', '0px', 'important');
      iframe.style.setProperty('box-shadow', '-10px 0 30px rgba(0, 0, 0, 0.5)', 'important');
      toggleBtn.style.setProperty('right', '400px', 'important');
      toggleBtn.style.setProperty('filter', 'drop-shadow(-4px 4px 14px rgba(228, 242, 34, 0.6))', 'important');
      
      if (mode === 'squeeze' && body) {
        body.style.setProperty('transition', 'margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 'important');
        body.style.setProperty('margin-right', '400px', 'important');
        body.style.setProperty('width', 'calc(100% - 400px)', 'important');
      } else if (body) {
        body.style.removeProperty('margin-right');
        body.style.removeProperty('width');
      }
    } else {
      iframe.style.setProperty('right', '-400px', 'important');
      iframe.style.setProperty('box-shadow', 'none', 'important');
      toggleBtn.style.setProperty('right', '0px', 'important');
      toggleBtn.style.setProperty('filter', 'drop-shadow(-3px 3px 10px rgba(0, 0, 0, 0.45))', 'important');
      
      if (body) {
        body.style.removeProperty('margin-right');
        body.style.removeProperty('width');
      }
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSidebarOpen) {
      toggleSidebar();
    }
  });

  // PostMessage interface with iframe
  window.addEventListener('message', (event) => {
    if (!iframe || event.source !== iframe.contentWindow) return;

    if (event.data?.type === 'CLOSE_CLIPSTAFF_SIDEBAR') {
      if (isSidebarOpen) toggleSidebar();
    }
    if (event.data?.type === 'INJECT_TEXT') {
      chrome.runtime.sendMessage({ type: 'BROADCAST_INJECT_TEXT', text: event.data.text }).catch(() => {
        injectText(event.data.text);
      });
    }
    if (event.data?.type === 'COPY_TEXT') {
      navigator.clipboard.writeText(event.data.text).catch(() => {});
    }
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'TOGGLE_SIDEBAR') {
      toggleSidebar();
      sendResponse({ status: 'done' });
      return true;
    }
    if (message.type === 'SHOW_PAGE_TOAST') {
      showPageToast(message.message, message.isError);
      sendResponse({ status: 'done' });
      return true;
    }
    if (message.type === 'JOB_SAVED_BY_SHORTCUT') {
      if (!isSidebarOpen) toggleSidebar();
      
      const relayMessage = () => {
        if (iframe && iframe.contentWindow) {
          const extensionOrigin = chrome.runtime.getURL('').slice(0, -1);
          iframe.contentWindow.postMessage({
            type: 'JOB_SAVED_BY_SHORTCUT',
            job: message.job
          }, extensionOrigin);
        }
      };

      if (iframe.src) {
        relayMessage();
      } else {
        iframe.onload = () => {
          relayMessage();
          iframe.onload = null;
        };
      }
      sendResponse({ status: 'done' });
      return true;
    }
  });

  // Spotlight Command Bar HUD Overlay
  initSpotlight(() => shortcutCache);

  // Application Submission Detection
  initApplicationSubmittedDetector();
}

// Global runtime message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    loadCacheFromStorage();
    sendResponse({ status: 'ready', shortcutsCount: Object.keys(shortcutCache).length });
    return true;
  }
  if (message.type === 'INJECT_TEXT') {
    injectText(message.text);
    sendResponse({ status: 'done' });
    return true;
  }
});

function showPageToast(message: string, isError: boolean = false) {
  const existing = document.getElementById('clipstaff-page-toast');
  if (existing) existing.remove();

  const toastEl = document.createElement('div');
  toastEl.id = 'clipstaff-page-toast';
  toastEl.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    background: ${isError ? '#1E1B1B' : '#0A0A0A'} !important;
    color: #F8FAFC !important;
    border: 1px solid ${isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'} !important;
    border-radius: 8px !important;
    padding: 12px 18px !important;
    font-size: 13px !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    font-weight: 500 !important;
    box-shadow: ${isError ? '0 10px 30px rgba(239, 68, 68, 0.1), 0 0 15px rgba(239, 68, 68, 0.05)' : '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 242, 254, 0.08)'} !important;
    z-index: 2147483647 !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    pointer-events: none !important;
    transform: translateY(20px) !important;
    opacity: 0 !important;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease !important;
  `;

  const iconEl = document.createElement('span');
  iconEl.innerHTML = isError ? '✗' : '✓';
  iconEl.style.cssText = `color: ${isError ? '#EF4444' : '#00F2FE'} !important; font-weight: bold !important;`;
  toastEl.appendChild(iconEl);

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
      if (document.body.contains(toastEl)) toastEl.remove();
    }, 300);
  }, isError ? 5000 : 3000);
}

function injectText(text: string) {
  const el = lastFocusedInput;
  if (!el || !document.body.contains(el)) return;
  
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
      const nativeSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeSetter) {
        nativeSetter.call(el, el.value.slice(0, cursorStart) + text + el.value.slice(cursorEnd));
      } else {
        el.value = el.value.slice(0, cursorStart) + text + el.value.slice(cursorEnd);
      }
      
      ['input', 'change'].forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })));
    } else {
      try {
        el.setSelectionRange(cursorStart, cursorEnd);
        const success = document.execCommand('insertText', false, text);
        if (!success) {
          if ('setRangeText' in el) {
            el.setRangeText(text, cursorStart, cursorEnd, 'end');
          } else {
            (el as any).value = (el as any).value.slice(0, cursorStart) + text + (el as any).value.slice(cursorEnd);
          }
          ['input', 'change'].forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })));
        }
      } catch (err) {
        (el as any).value = (el as any).value.slice(0, cursorStart) + text + (el as any).value.slice(cursorEnd);
        ['input', 'change'].forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })));
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

// ============================================================================
// SHORTCUT EXPANSION ENGINE
// ============================================================================

// Trigger-based expansion on Space, Enter, Tab, or Semicolon (;)
document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement;
  if (!target) return;

  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable;

  if (!isInput && !isContentEditable) return;

  if (event.key === ' ' || event.key === 'Enter' || event.key === 'Tab' || event.key === ';') {
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

    const match = textBeforeCursor.match(/(\S{1,})$/);
    if (!match) return;

    const fullWord = match[1];
    const rawLower = fullWord.toLowerCase();
    
    let expandedText: string | undefined = undefined;
    const matchedWord = fullWord;

    if (event.key === ';') {
      expandedText = shortcutCache[`${rawLower};`] || shortcutCache[rawLower];
    } else {
      expandedText = shortcutCache[rawLower];
      if (!expandedText && rawLower.endsWith(';')) {
        expandedText = shortcutCache[rawLower.slice(0, -1)];
      }
      if (!expandedText) {
        expandedText = shortcutCache[`${rawLower};`];
      }
    }

    if (expandedText) {
      event.preventDefault();
      event.stopPropagation();
      performExpansion(element, cursorPosition, matchedWord, expandedText, event, isRestrictedInput);
    }
  } catch (err) {
    console.warn('ClipStaff: Trigger expansion failed', err);
  }
}

function insertTextIntoElement(
  element: HTMLElement,
  cursorPosition: number,
  fullWord: string,
  textToInsert: string,
  isRestrictedInput: boolean
) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = cursorPosition - fullWord.length;
    const end = cursorPosition;
    
    element.focus();
    const target = element;

    if (isRestrictedInput) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        target.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeSetter) {
        nativeSetter.call(target, target.value.slice(0, start) + textToInsert + target.value.slice(end));
      } else {
        target.value = target.value.slice(0, start) + textToInsert + target.value.slice(end);
      }
      
      ['input', 'change'].forEach(type => element.dispatchEvent(new Event(type, { bubbles: true })));
    } else {
      try {
        target.setSelectionRange(start, end);
        const success = document.execCommand('insertText', false, textToInsert);
        
        if (!success) {
          if ('setRangeText' in target) {
            target.setRangeText(textToInsert, start, end, 'end');
          } else {
            (target as any).value = (target as any).value.slice(0, start) + textToInsert + (target as any).value.slice(end);
          }
          ['input', 'change'].forEach(type => element.dispatchEvent(new Event(type, { bubbles: true })));
        }
      } catch (err) {
        (target as any).value = (target as any).value.slice(0, start) + textToInsert + (target as any).value.slice(end);
        ['input', 'change'].forEach(type => element.dispatchEvent(new Event(type, { bubbles: true })));
      }
    }
  } else if (element.isContentEditable) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    
    range.setStart(range.startContainer, cursorPosition - fullWord.length);
    range.setEnd(range.startContainer, cursorPosition);
    range.deleteContents();
    
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

function performExpansion(
  element: HTMLElement,
  cursorPosition: number,
  fullWord: string,
  expandedText: string,
  event: KeyboardEvent | null,
  isRestrictedInput: boolean
) {
  const { resolvedText, unresolved } = resolveTemplate(
    expandedText,
    activeProfileCache,
    window.location.href
  );

  const proceedWithText = (finalText: string) => {
    let textToInsert = finalText;
    if (event) {
      if (event.key === ' ') {
        textToInsert += ' ';
      } else if (event.key === 'Enter') {
        if (element instanceof HTMLTextAreaElement || element.isContentEditable) {
          textToInsert += '\n';
        }
      }
    }
    insertTextIntoElement(element, cursorPosition, fullWord, textToInsert, isRestrictedInput);
  };

  if (unresolved.length > 0) {
    if (event) event.preventDefault();
    showHudPrompt(
      unresolved,
      (values) => {
        let finalResolvedText = resolvedText;
        Object.keys(values).forEach((key) => {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
          finalResolvedText = finalResolvedText.replace(regex, values[key]);
        });
        proceedWithText(finalResolvedText);
      },
      () => {
        element.focus();
      }
    );
  } else {
    if (event) event.preventDefault();
    proceedWithText(resolvedText);
  }
}

// Instant expansion on input with O(1) hash lookup
document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement;
  if (!target) return;

  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  const isContentEditable = target.isContentEditable;

  if (!isInput && !isContentEditable) return;

  handleInstantExpansion(target);
}, { capture: true, passive: true });

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

    // Extract the trailing word before the cursor (up to 30 chars)
    const match = textBeforeCursor.match(/(\S{1,30})$/);
    if (!match) return;

    const token = match[1].toLowerCase();
    
    // Direct O(1) lookup
    let matchedKey: string | undefined;
    if (shortcutCache[token]) {
      matchedKey = token;
    } else {
      // Suffix check
      for (let len = Math.min(token.length, 12); len >= 2; len--) {
        const sub = token.slice(-len);
        if (shortcutCache[sub]) {
          matchedKey = sub;
          break;
        }
      }
    }

    if (matchedKey) {
      const expandedText = shortcutCache[matchedKey];
      if (expandedText) {
        performExpansion(element, cursorPosition, matchedKey, expandedText, null, isRestrictedInput);
      }
    }
  } catch (err) {
    console.warn('ClipStaff: Instant expansion failed', err);
  }
}

// ============================================================================
// TOP-FRAME SHORTCUT & SUBMISSION DETECTOR
// ============================================================================

if (isTopFrame) {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  interface ParsedShortcut {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    keyChar: string;
  }

  let parsedShortcut: ParsedShortcut = { ctrl: !isMac, shift: true, alt: false, meta: isMac, keyChar: 'x' };

  function parseShortcut(shortcutStr: string): ParsedShortcut {
    if (!shortcutStr || !shortcutStr.includes('+')) {
      return { ctrl: !isMac, shift: true, alt: false, meta: isMac, keyChar: 'x' };
    }
    const parts = shortcutStr.split('+').map(p => p.trim().toLowerCase());
    const needsCtrl = parts.includes('ctrl') || parts.includes('control');
    const needsMeta = parts.includes('meta') || parts.includes('⌘') || parts.includes('cmd') || parts.includes('command');
    const shift = parts.includes('shift');
    const alt = parts.includes('alt') || parts.includes('option');
    const keyChar = parts.find(p => !['ctrl', 'control', 'shift', 'alt', 'option', 'meta', '⌘', 'cmd', 'command'].includes(p)) || '';
    
    return { ctrl: needsCtrl, shift, alt, meta: needsMeta, keyChar };
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['activeSaveShortcut'], (res) => {
      if (res?.activeSaveShortcut) {
        parsedShortcut = parseShortcut(res.activeSaveShortcut);
      }
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.activeSaveShortcut?.newValue) {
        parsedShortcut = parseShortcut(changes.activeSaveShortcut.newValue);
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    const { ctrl, shift, alt, meta, keyChar } = parsedShortcut;
    if (!keyChar) return;

    const needsCtrlOrMeta = ctrl || meta;
    const isCtrlOrMetaPressed = event.ctrlKey || event.metaKey;

    const modifiersMatch = 
      (needsCtrlOrMeta === isCtrlOrMetaPressed) &&
      (shift === event.shiftKey) &&
      (alt === event.altKey);
      
    const keyMatch = event.key.toLowerCase() === keyChar || event.code.toLowerCase() === `key${keyChar}`;
    
    if (modifiersMatch && keyMatch) {
      event.preventDefault();
      event.stopPropagation();
      
      chrome.runtime.sendMessage({
        type: 'SAVE_CURRENT_JOB_VIA_SHORTCUT',
        url: window.location.href
      }).catch((err) => {
        console.warn('ClipStaff: Failed to send SAVE_CURRENT_JOB_VIA_SHORTCUT message:', err);
      });
    }
  }, true);
}

function initApplicationSubmittedDetector() {
  let hasPromptedForCurrentUrl = false;
  let lastCheckedUrl = window.location.href;

  const SUBMISSION_SIGNATURES = [
    'application submitted',
    'thank you for applying',
    'thanks for applying',
    'application received',
    'your application has been submitted',
    'successfully submitted your application',
    'your application was sent',
    'applied successfully',
    'application confirmation'
  ];

  const checkPageForSubmission = () => {
    if (window.location.href !== lastCheckedUrl) {
      lastCheckedUrl = window.location.href;
      hasPromptedForCurrentUrl = false;
    }

    if (hasPromptedForCurrentUrl) return;

    const urlLower = window.location.href.toLowerCase();
    const isConfirmationUrl = urlLower.includes('/confirmation') || 
                              urlLower.includes('/thank-you') || 
                              urlLower.includes('/thanks') || 
                              urlLower.includes('/submitted') || 
                              urlLower.includes('/post-apply') ||
                              urlLower.includes('application_submitted=true');

    let foundSignature = isConfirmationUrl;
    if (!foundSignature) {
      const candidates = document.querySelectorAll('h1, h2, h3, [role="alert"], [role="status"], .success-message, .application-success, .confirmation');
      for (const el of Array.from(candidates)) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text.length > 0 && text.length < 150) {
          if (SUBMISSION_SIGNATURES.some(sig => text.includes(sig))) {
            foundSignature = true;
            break;
          }
        }
      }
    }

    if (foundSignature) {
      hasPromptedForCurrentUrl = true;
      showApplicationSubmittedPrompt(window.location.href);
    }
  };

  // Event-driven checks (zero continuous mutation polling)
  if (document.readyState === 'complete') {
    setTimeout(checkPageForSubmission, 800);
  } else {
    window.addEventListener('load', () => setTimeout(checkPageForSubmission, 800), { once: true });
  }

  window.addEventListener('popstate', () => setTimeout(checkPageForSubmission, 1000), { passive: true });
  window.addEventListener('hashchange', () => setTimeout(checkPageForSubmission, 1000), { passive: true });

  document.addEventListener('submit', () => setTimeout(checkPageForSubmission, 1800), { passive: true, capture: true });
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('type') === 'submit')) {
      const text = (target.textContent || '').toLowerCase();
      if (text.includes('submit') || text.includes('apply')) {
        setTimeout(checkPageForSubmission, 1800);
      }
    }
  }, { passive: true, capture: true });
}

function showApplicationSubmittedPrompt(url: string) {
  const existing = document.getElementById('clipstaff-submitted-prompt');
  if (existing) existing.remove();

  const company = extractCompanyFromUrl(url);
  const role = extractRoleFromUrl(url);

  const container = document.createElement('div');
  container.id = 'clipstaff-submitted-prompt';
  container.style.cssText = `
    position: fixed !important;
    bottom: 30px !important;
    right: 30px !important;
    max-width: 360px !important;
    background: #0D0D0D !important;
    border: 1px solid rgba(228, 242, 34, 0.4) !important;
    border-radius: 14px !important;
    padding: 14px 16px !important;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(228, 242, 34, 0.15) !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    color: #F8FAFC !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
    transform: translateY(20px) !important;
    opacity: 0 !important;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease !important;
    pointer-events: auto !important;
  `;

  const header = document.createElement('div');
  header.style.cssText = 'display: flex !important; align-items: center; justify-content: space-between; gap: 8px;';
  
  const titleGroup = document.createElement('div');
  titleGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  
  const icon = document.createElement('span');
  icon.innerHTML = '⚡';
  icon.style.cssText = 'font-size: 16px; color: #E4F222;';
  titleGroup.appendChild(icon);

  const title = document.createElement('span');
  title.innerText = 'Application Submitted!';
  title.style.cssText = 'font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #FFFFFF;';
  titleGroup.appendChild(title);
  header.appendChild(titleGroup);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = 'background: transparent; border: none; color: #94A3B8; font-size: 12px; cursor: pointer; padding: 2px 6px; border-radius: 4px;';
  closeBtn.addEventListener('click', () => {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    setTimeout(() => container.remove(), 300);
  });
  header.appendChild(closeBtn);
  container.appendChild(header);

  const bodyText = document.createElement('div');
  bodyText.style.cssText = 'font-size: 11px; color: #94A3B8; line-height: 1.4;';
  bodyText.innerHTML = `Mark <strong style="color: #FFFFFF;">${role}</strong> at <strong style="color: #FFFFFF;">${company}</strong> as <span style="color: #4ADE80; font-weight: 600;">Applied</span> in ClipStaff?`;
  container.appendChild(bodyText);

  const actionRow = document.createElement('div');
  actionRow.style.cssText = 'display: flex; gap: 8px; margin-top: 4px;';

  const confirmBtn = document.createElement('button');
  confirmBtn.innerText = '✓ Mark as Applied';
  confirmBtn.style.cssText = `
    flex: 1;
    background: #E4F222;
    color: #0A0A0A;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.2s;
  `;
  confirmBtn.addEventListener('click', () => {
    confirmBtn.disabled = true;
    confirmBtn.innerText = 'Updating...';
    chrome.runtime.sendMessage({
      type: 'MARK_JOB_APPLIED_FROM_PAGE',
      url,
      company,
      role
    }, () => {
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      setTimeout(() => container.remove(), 300);
    });
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.innerText = 'Dismiss';
  dismissBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.05);
    color: #94A3B8;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  `;
  dismissBtn.addEventListener('click', () => {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    setTimeout(() => container.remove(), 300);
  });

  actionRow.appendChild(confirmBtn);
  actionRow.appendChild(dismissBtn);
  container.appendChild(actionRow);

  document.body.appendChild(container);

  requestAnimationFrame(() => {
    container.style.transform = 'translateY(0)';
    container.style.opacity = '1';
  });

  setTimeout(() => {
    if (document.body.contains(container)) {
      container.style.opacity = '0';
      container.style.transform = 'translateY(20px)';
      setTimeout(() => container.remove(), 300);
    }
  }, 15000);
}
