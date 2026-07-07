import { describe, it, expect, beforeAll } from 'vitest';

describe('content script trigger expansion integration', () => {
  beforeAll(async () => {
    // Pre-seed storage caches before content script binds listeners
    await new Promise<void>((resolve) => {
      chrome.storage.local.set(
        {
          clipstaff_shortcuts: {
            ';greet': 'Hello world!',
            ';mail': 'My mail is {{email}}',
          },
          clipstaff_active_profile: {
            full_name: 'John Doe',
            email: 'john@example.com',
          },
        },
        resolve
      );
    });

    // Import content script to trigger event listeners binding
    await import('./content');

    // Wait for the asynchronous loadCacheFromStorage() call inside content.ts to finish
    await new Promise((r) => setTimeout(r, 100));
  });

  it('should expand normal shortcuts on Tab keydown', async () => {
    const input = document.createElement('textarea');
    document.body.appendChild(input);
    input.focus();

    input.value = ';greet';
    // Position cursor at the end of the shortcut word
    input.selectionStart = ';greet'.length;
    input.selectionEnd = ';greet'.length;

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    // Yield execution to allow trigger microtasks to finish
    await new Promise((r) => setTimeout(r, 50));

    expect(input.value).toBe('Hello world!');
    document.body.removeChild(input);
  });

  it('should substitute profile placeholders automatically during expansion', async () => {
    const input = document.createElement('textarea');
    document.body.appendChild(input);
    input.focus();

    input.value = ';mail';
    input.selectionStart = ';mail'.length;
    input.selectionEnd = ';mail'.length;

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    await new Promise((r) => setTimeout(r, 50));

    expect(input.value).toBe('My mail is john@example.com');
    document.body.removeChild(input);
  });
});
