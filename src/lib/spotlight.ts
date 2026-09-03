/**
 * ClipStaff Spotlight HUD Overlay - Quick Actions & Profile Switcher Edition
 */

import { Profile } from '../types';
import { syncShortcutsToStorage } from './sync';

let hudContainer: HTMLDivElement | null = null;
let hudInput: HTMLInputElement | null = null;
let hudList: HTMLDivElement | null = null;
let hudActiveIndex = 0;
let hudFilteredItems: Array<{ type: 'shortcut' | 'profile'; key: string; text: string; profile?: Profile; isActive?: boolean }> = [];
let lastActiveElement: HTMLElement | null = null;
let currentShortcutCache: Record<string, string> = {};
let cachedProfilesList: Profile[] = [];
let currentActiveProfile: Profile | null = null;

export function showHUD(activeEl: HTMLElement, shortcutCache: Record<string, string>) {
  if (hudContainer) return;
  lastActiveElement = activeEl;
  currentShortcutCache = shortcutCache;

  // Load profiles from storage
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['clipstaff_profiles_list', 'clipstaff_active_profile', 'clipstaff-storage'], (result) => {
      if (result.clipstaff_profiles_list) {
        cachedProfilesList = result.clipstaff_profiles_list;
      } else if (result['clipstaff-storage']) {
        try {
          const parsed = JSON.parse(result['clipstaff-storage']);
          if (parsed?.state?.profiles) {
            cachedProfilesList = parsed.state.profiles;
          }
        } catch {}
      }
      if (result.clipstaff_active_profile) {
        currentActiveProfile = result.clipstaff_active_profile;
      }
      renderHUDList(hudInput?.value || '');
    });
  }

  // Ensure animations and style tag are present in document
  if (!document.getElementById('clipstaff-hud-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'clipstaff-hud-style';
    styleEl.textContent = `
      @keyframes clipstaffHudIn {
        0% { opacity: 0; transform: translate(-50%, -10px) scale(0.98); }
        100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
      }
      #clipstaff-hud ::-webkit-scrollbar {
        width: 5px;
      }
      #clipstaff-hud ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 999px;
      }
      #clipstaff-hud ::-webkit-scrollbar-thumb:hover {
        background: rgba(228, 242, 34, 0.5);
      }
    `;
    document.head.appendChild(styleEl);
  }

  hudContainer = document.createElement('div');
  hudContainer.id = 'clipstaff-hud';
  hudContainer.style.cssText = `
    position: fixed !important;
    top: 20% !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 480px !important;
    max-height: 420px !important;
    background: rgba(13, 13, 13, 0.96) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(228, 242, 34, 0.28) !important;
    border-radius: 16px !important;
    box-shadow: 0 25px 70px rgba(0, 0, 0, 0.85), 0 0 30px rgba(228, 242, 34, 0.12) !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    animation: clipstaffHudIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
  `;

  // Search Input Wrapper
  const searchWrapper = document.createElement('div');
  searchWrapper.style.cssText = `
    padding: 14px 18px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    background: rgba(255, 255, 255, 0.02) !important;
  `;

  const searchIcon = document.createElement('span');
  searchIcon.innerText = '⚡';
  searchIcon.style.cssText = 'font-size: 15px; color: #E4F222; shrink-0;';
  searchWrapper.appendChild(searchIcon);
  
  hudInput = document.createElement('input');
  hudInput.placeholder = 'Search shortcuts or type /p to switch profile... (Esc to close)';
  hudInput.style.cssText = `
    width: 100% !important;
    background: transparent !important;
    border: none !important;
    outline: none !important;
    color: #FFFFFF !important;
    font-size: 13px !important;
    font-family: inherit !important;
  `;
  searchWrapper.appendChild(hudInput);
  hudContainer.appendChild(searchWrapper);

  // Shortcuts / Actions List Container
  hudList = document.createElement('div');
  hudList.style.cssText = `
    flex: 1 !important;
    overflow-y: auto !important;
    max-height: 320px !important;
    padding: 8px !important;
  `;
  hudContainer.appendChild(hudList);

  // Footer helper bar
  const footerBar = document.createElement('div');
  footerBar.style.cssText = `
    padding: 8px 16px !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    background: rgba(0, 0, 0, 0.5) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    font-size: 10px !important;
    color: #94A3B8 !important;
  `;
  footerBar.innerHTML = `
    <span><strong>↑↓</strong> to navigate</span>
    <span><strong>↵</strong> to insert/switch</span>
    <span><strong>/p</strong> profiles</span>
  `;
  hudContainer.appendChild(footerBar);

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
  const isProfileCommand = q.startsWith('/') || q.startsWith('p ') || q.startsWith('switch ');
  
  hudFilteredItems = [];

  // 1. Profile Switch Items
  if (cachedProfilesList.length > 0) {
    const profileFilter = isProfileCommand 
      ? q.replace(/^(\/p|\/profile|\/switch|\/|p|switch)\s*/i, '').trim()
      : q;

    const matchedProfiles = isProfileCommand
      ? cachedProfilesList.filter(p => {
          if (!profileFilter) return true;
          const name = (p.full_name || p.name || '').toLowerCase();
          return name.includes(profileFilter);
        })
      : [];

    matchedProfiles.forEach(p => {
      const name = p.full_name || p.name || 'Unnamed Candidate';
      const isActive = currentActiveProfile?.id === p.id || currentActiveProfile?.full_name === p.full_name;
      hudFilteredItems.push({
        type: 'profile',
        key: `/p ${name}`,
        text: `${name} ${p.professional_subtitle ? `• ${p.professional_subtitle}` : ''}`,
        profile: p,
        isActive
      });
    });
  }

  // 2. Regular Shortcut Items
  if (!isProfileCommand || hudFilteredItems.length === 0) {
    const keys = Object.keys(currentShortcutCache).filter(key => 
      key.includes(q) || currentShortcutCache[key].toLowerCase().includes(q)
    );

    keys.forEach(key => {
      hudFilteredItems.push({
        type: 'shortcut',
        key,
        text: currentShortcutCache[key]
      });
    });
  }

  if (hudFilteredItems.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = `
      padding: 20px !important;
      text-align: center !important;
      font-size: 12px !important;
      color: rgba(255, 255, 255, 0.3) !important;
    `;
    empty.textContent = isProfileCommand ? 'No matching candidate profiles found' : 'No matching shortcuts found. Type /p to view candidate profiles.';
    listEl.appendChild(empty);
    return;
  }

  hudFilteredItems.forEach((item, index) => {
    const row = document.createElement('div');
    const isSelected = index === hudActiveIndex;
    const isProfile = item.type === 'profile';

    row.style.cssText = `
      padding: 10px 12px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      background: ${isSelected ? (isProfile ? 'rgba(228, 242, 34, 0.12)' : 'rgba(99, 102, 241, 0.15)') : 'transparent'} !important;
      border: 1px solid ${isSelected ? (isProfile ? 'rgba(228, 242, 34, 0.3)' : 'rgba(99, 102, 241, 0.3)') : 'transparent'} !important;
      transition: background 0.15s, border 0.15s !important;
    `;

    const badge = document.createElement('span');
    badge.style.cssText = `
      background: ${isProfile ? 'rgba(228, 242, 34, 0.15)' : 'rgba(99, 102, 241, 0.15)'} !important;
      color: ${isProfile ? '#E4F222' : '#818CF8'} !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      padding: 3px 7px !important;
      border-radius: 6px !important;
      font-family: monospace !important;
      border: 1px solid ${isProfile ? 'rgba(228, 242, 34, 0.3)' : 'rgba(99, 102, 241, 0.25)'} !important;
      shrink-0;
    `;
    badge.textContent = isProfile ? (item.isActive ? '👤 ACTIVE' : '👤 SWITCH') : item.key;
    row.appendChild(badge);

    const text = document.createElement('span');
    text.style.cssText = `
      color: ${isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'} !important;
      font-size: 12px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      flex: 1 !important;
    `;
    text.textContent = item.text;
    row.appendChild(text);

    row.addEventListener('click', () => {
      selectHUDItem(item);
    });

    listEl.appendChild(row);
  });
}

function handleHUDKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    closeHUD();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (hudFilteredItems.length > 0) {
      hudActiveIndex = (hudActiveIndex + 1) % hudFilteredItems.length;
      renderHUDList(hudInput?.value || '');
      scrollSelectedIntoView();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (hudFilteredItems.length > 0) {
      hudActiveIndex = (hudActiveIndex - 1 + hudFilteredItems.length) % hudFilteredItems.length;
      renderHUDList(hudInput?.value || '');
      scrollSelectedIntoView();
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (hudFilteredItems.length > 0 && hudActiveIndex < hudFilteredItems.length) {
      selectHUDItem(hudFilteredItems[hudActiveIndex]);
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

function selectHUDItem(item: { type: 'shortcut' | 'profile'; key: string; text: string; profile?: Profile }) {
  if (item.type === 'profile' && item.profile) {
    switchActiveProfile(item.profile);
  } else {
    insertHUDText(item.text);
  }
}

function switchActiveProfile(profile: Profile) {
  currentActiveProfile = profile;
  const name = profile.full_name || profile.name || 'Candidate';

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ clipstaff_active_profile: profile }, () => {
      // Re-sync shortcuts for new profile
      const updatedShortcuts = syncShortcutsToStorage([], {}, profile, {}, cachedProfilesList);
      currentShortcutCache = updatedShortcuts;
      
      // Show feedback banner in HUD
      if (hudInput) {
        hudInput.value = '';
      }
      showInPageSwitchFeedback(name);
      closeHUD();
    });
  } else {
    showInPageSwitchFeedback(name);
    closeHUD();
  }
}

function showInPageSwitchFeedback(candidateName: string) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    background: #0D0D0D !important;
    color: #FFFFFF !important;
    border: 1px solid rgba(228, 242, 34, 0.4) !important;
    border-radius: 8px !important;
    padding: 10px 16px !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    z-index: 2147483647 !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6) !important;
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  `;
  toast.innerHTML = `<span style="color: #E4F222;">⚡</span> Switched active profile to <strong>${candidateName}</strong>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
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
    // Support Alt+Shift+S or Ctrl+Shift+K (Cmd+Shift+K on Mac)
    const isAltShiftS = event.altKey && event.shiftKey && (event.key === 'S' || event.key === 's');
    const isCtrlShiftK = (event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'K' || event.key === 'k');

    if (isAltShiftS || isCtrlShiftK) {
      const target = event.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) {
        event.preventDefault();
        showHUD(target, getShortcutCache());
      }
    }
  });
}
