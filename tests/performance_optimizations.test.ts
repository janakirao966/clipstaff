import { describe, it, expect, beforeEach } from 'vitest';
import { syncShortcutsToStorage } from '../src/lib/sync';
import { useStore } from '../src/store/useStore';
import { Profile, Snippet } from '../src/types';

describe('Performance & State Sync Optimizations', () => {
  beforeEach(() => {
    useStore.getState().resetStore();
  });

  it('should automatically register cover; and cl; shortcuts when tailoredCoverLetter is provided', () => {
    const profile: Profile = {
      id: 'p-1',
      user_id: 'u-1',
      name: 'Test Candidate',
      full_name: 'Test Candidate',
      email: 'test@example.com',
      is_active: true
    };

    const coverLetterText = 'Dear Hiring Manager,\nI am writing to express my enthusiasm for the Senior Engineer role.';

    const shortcuts = syncShortcutsToStorage([], {}, profile, {}, [profile], coverLetterText);

    expect(shortcuts['cover;']).toBe(coverLetterText);
    expect(shortcuts['cl;']).toBe(coverLetterText);
    expect(shortcuts['test@example.com']).toBeUndefined(); // Email mapped to shortcut key
    expect(shortcuts['tgm']).toBe('test@example.com');
  });

  it('should not update state when setDynamicShortcuts is called with identical values', () => {
    const initialShortcuts = { exp1: '- Built scalable APIs', exp2: '- Managed cloud infra' };
    useStore.getState().setDynamicShortcuts(initialShortcuts);

    const stateBefore = useStore.getState();
    const shortcutsBefore = stateBefore.dynamicShortcuts;

    // Call with identical keys and values
    useStore.getState().setDynamicShortcuts({ exp1: '- Built scalable APIs', exp2: '- Managed cloud infra' });

    const stateAfter = useStore.getState();
    expect(stateAfter.dynamicShortcuts).toBe(shortcutsBefore); // exact reference preserved!
  });

  it('should update state when setDynamicShortcuts has changed content', () => {
    const initialShortcuts = { exp1: '- Built scalable APIs' };
    useStore.getState().setDynamicShortcuts(initialShortcuts);

    const shortcutsBefore = useStore.getState().dynamicShortcuts;

    // Call with new key
    useStore.getState().setDynamicShortcuts({ exp1: '- Built scalable APIs', exp2: '- Added new feature' });

    const shortcutsAfter = useStore.getState().dynamicShortcuts;
    expect(shortcutsAfter).not.toBe(shortcutsBefore);
    expect(shortcutsAfter['exp2']).toBe('- Added new feature');
  });
});
