/**
 * ClipStaff Spotlight HUD Overlay
 */

let hudContainer: HTMLDivElement | null = null;
let hudInput: HTMLInputElement | null = null;
let hudList: HTMLDivElement | null = null;
let hudActiveIndex = 0;
let hudFilteredKeys: string[] = [];
let lastActiveElement: HTMLElement | null = null;
let currentShortcutCache: Record<string, string> = {};

export function showHUD(activeEl: HTMLElement, shortcutCache: Record<string, string>) {
  if (hudContainer) return;
  lastActiveElement = activeEl;
  currentShortcutCache = shortcutCache;

  hudContainer = document.createElement('div');
  hudContainer.id = 'clipstaff-hud';
  hudContainer.style.cssText = `
    position: fixed !important;
    top: 20% !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 450px !important;
    max-height: 380px !important;
    background: #0D0D0D !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  `;

  // Search Input Wrapper
  const searchWrapper = document.createElement('div');
  searchWrapper.style.cssText = `
    padding: 14px 18px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    display: flex !important;
    align-items: center !important;
  `;
  
  hudInput = document.createElement('input');
  hudInput.placeholder = 'Search shortcuts... (Esc to close)';
  hudInput.style.cssText = `
    width: 100% !important;
    background: transparent !important;
    border: none !important;
    outline: none !important;
    color: #FFFFFF !important;
    font-size: 14px !important;
    font-family: inherit !important;
  `;
  searchWrapper.appendChild(hudInput);
  hudContainer.appendChild(searchWrapper);

  // Shortcuts List Container
  hudList = document.createElement('div');
  hudList.style.cssText = `
    flex: 1 !important;
    overflow-y: auto !important;
    max-height: 280px !important;
    padding: 8px !important;
  `;
  hudContainer.appendChild(hudList);

  document.body.appendChild(hudContainer);
  hudInput.focus();

  hudActiveIndex = 0;
  renderHUDList('');

  // Handle Input Changes
  hudInput.addEventListener('input', (e) => {
    hudActiveIndex = 0;
    renderHUDList((e.target as HTMLInputElement).value);
  });

  // Keyboard navigation
  hudInput.addEventListener('keydown', handleHUDKeydown);
}

export function closeHUD() {
  if (hudContainer) {
    hudContainer.remove();
    hudContainer = null;
    hudInput = null;
    hudList = null;
  }
  if (lastActiveElement) {
    lastActiveElement.focus();
    lastActiveElement = null;
  }
}

function renderHUDList(query: string) {
  const listEl = hudList;
  if (!listEl) return;
  listEl.innerHTML = '';
  
  const q = query.toLowerCase().trim();
  hudFilteredKeys = Object.keys(currentShortcutCache).filter(key => 
    key.includes(q) || currentShortcutCache[key].toLowerCase().includes(q)
  );

  if (hudFilteredKeys.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      padding: 16px !important;
      text-align: center !important;
      font-size: 12px !important;
      color: rgba(255, 255, 255, 0.3) !important;
    `;
    empty.textContent = 'No matching shortcuts found';
    listEl.appendChild(empty);
    return;
  }

  hudFilteredKeys.forEach((key, index) => {
    const item = document.createElement('div');
    const isSelected = index === hudActiveIndex;
    item.style.cssText = `
      padding: 10px 12px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      background: ${isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent'} !important;
      border: 1px solid ${isSelected ? 'rgba(99, 102, 241, 0.3)' : 'transparent'} !important;
      transition: background 0.15s, border 0.15s !important;
    `;

    const badge = document.createElement('span');
    badge.style.cssText = `
      background: rgba(99, 102, 241, 0.15) !important;
      color: #818CF8 !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      padding: 3px 6px !important;
      border-radius: 6px !important;
      font-family: monospace !important;
      border: 1px solid rgba(99, 102, 241, 0.25) !important;
    `;
    badge.textContent = key;
    item.appendChild(badge);

    const text = document.createElement('span');
    text.style.cssText = `
      color: ${isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'} !important;
      font-size: 12px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      flex: 1 !important;
    `;
    text.textContent = currentShortcutCache[key];
    item.appendChild(text);

    item.addEventListener('click', () => {
      insertHUDText(currentShortcutCache[key]);
    });

    listEl.appendChild(item);
  });
}

function handleHUDKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeHUD();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (hudFilteredKeys.length > 0) {
      hudActiveIndex = (hudActiveIndex + 1) % hudFilteredKeys.length;
      renderHUDList(hudInput?.value || '');
      scrollSelectedIntoView();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (hudFilteredKeys.length > 0) {
      hudActiveIndex = (hudActiveIndex - 1 + hudFilteredKeys.length) % hudFilteredKeys.length;
      renderHUDList(hudInput?.value || '');
      scrollSelectedIntoView();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (hudFilteredKeys.length > 0 && hudActiveIndex < hudFilteredKeys.length) {
      insertHUDText(currentShortcutCache[hudFilteredKeys[hudActiveIndex]]);
    }
  }
}

function scrollSelectedIntoView() {
  if (!hudList) return;
  const selectedEl = hudList.children[hudActiveIndex] as HTMLElement;
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest' });
  }
}

function insertHUDText(text: string) {
  if (!lastActiveElement) return;
  const el = lastActiveElement;
  closeHUD();

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    el.focus();
    
    // Use execCommand to preserve undo/redo history and trigger React bindings
    const success = document.execCommand('insertText', false, text);
    if (!success) {
      if ('setRangeText' in el) {
        (el as any).setRangeText(text, start, end, 'end');
      } else {
        (el as any).value = (el as any).value.slice(0, start) + text + (el as any).value.slice(end);
      }
      ['input', 'change'].forEach(type => {
        el.dispatchEvent(new Event(type, { bubbles: true }));
      });
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

export function initSpotlight(getShortcutCache: () => Record<string, string>) {
  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.shiftKey && (event.key === 'S' || event.key === 's')) {
      const target = event.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) {
        event.preventDefault();
        showHUD(target, getShortcutCache());
      }
    }
  });
}
