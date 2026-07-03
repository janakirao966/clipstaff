import { toast } from 'sonner';

/**
 * Copies text to the system clipboard and shows a notification.
 * @param text The string to copy
 * @param label Human-readable label for the toast notification
 */
export const copyToClipboard = async (text: string | null | undefined, label: string) => {
  if (!text) {
    toast.error(`Nothing to copy for ${label}`);
    return false;
  }

  const cleanText = text.trim();

  // Try 1: Standard navigator.clipboard
  try {
    await navigator.clipboard.writeText(cleanText);
    toast.success(`${label} copied!`);
    return true;
  } catch (err) {
    console.warn('ClipStaff: navigator.clipboard failed, attempting fallback...', err);

    // Try 2: Temporary textarea (execCommand('copy'))
    try {
      const textArea = document.createElement('textarea');
      textArea.value = cleanText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (success) {
        toast.success(`${label} copied!`);
        return true;
      }
    } catch (fallbackErr) {
      console.warn('ClipStaff: execCommand fallback failed...', fallbackErr);
    }

    // Try 3: Send message to parent window (content script) to copy
    try {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        window.parent.postMessage({ type: 'COPY_TEXT', text: cleanText }, '*');
        toast.success(`${label} copied!`);
        return true;
      }
    } catch (msgErr) {
      console.error('ClipStaff: postMessage fallback failed...', msgErr);
    }

    toast.error('Failed to copy to clipboard');
    return false;
  }
};

/**
 * Handles snippet/shortcut click: copies to clipboard and attempts direct injection into the active webpage input
 */
export const handleShortcutClick = async (text: string | null | undefined, label: string) => {
  if (!text) return;
  
  // 1. Copy to clipboard
  await copyToClipboard(text, label);

  // 2. Inject text into page
  try {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      window.parent.postMessage({ type: 'INJECT_TEXT', text }, '*');
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'INJECT_TEXT', text }).catch(() => {
          // Content script not loaded or active on this tab
        });
      }
    }
  } catch (err) {
    console.error('Direct injection trigger error:', err);
  }
};
