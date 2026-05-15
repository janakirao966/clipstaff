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

  try {
    await navigator.clipboard.writeText(cleanText);
    toast.success(`${label} copied!`);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    toast.error('Failed to copy to clipboard');
    return false;
  }
};
