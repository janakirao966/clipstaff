import { supabase, isSupabaseConfigured } from './supabase';

export const SECURITY_QUESTIONS_PRESETS = [
  "What was the name of your first pet?",
  "In what city or town were you born?",
  "What was the make and model of your first car?",
  "What was the name of your first elementary school?",
  "What was your childhood nickname?",
  "What is your favorite book or movie?",
  "What was the name of your first employer?",
  "What is your mother's maiden name?",
  "Custom Question (Write your own...)"
] as const;

export const CUSTOM_QUESTION_TRIGGER = "Custom Question (Write your own...)";

export function normalizeAnswer(ans: string): string {
  return (ans || '').trim().toLowerCase();
}

/**
 * Fetch security question for an email (Supports both Supabase Cloud & Local/Offline mode)
 */
export async function fetchUserSecurityQuestion(email: string): Promise<{
  question: string | null;
  isLocal: boolean;
  error?: string;
}> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { question: null, isLocal: false, error: 'Please enter a valid email address.' };
  }

  // 1. Check local storage first if in offline mode or if local key exists
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await new Promise<any>((resolve) => chrome.storage.local.get(['clipstaff_security_recovery', 'clipstaff_offline_mode'], resolve));
      const recoveryData = res?.clipstaff_security_recovery || {};
      if (recoveryData[cleanEmail]?.question) {
        return { question: recoveryData[cleanEmail].question, isLocal: true };
      }
      if (res?.clipstaff_offline_mode && recoveryData['local@clipstaff.app']?.question) {
        return { question: recoveryData['local@clipstaff.app'].question, isLocal: true };
      }
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('clipstaff_security_recovery');
      if (raw) {
        const recoveryData = JSON.parse(raw);
        if (recoveryData[cleanEmail]?.question) {
          return { question: recoveryData[cleanEmail].question, isLocal: true };
        }
      }
    }
  } catch (err) {
    console.warn('ClipStaff: Local security question check error:', err);
  }

  // 2. If Supabase is configured, call remote RPC function
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('get_user_security_question', {
        p_email: cleanEmail
      });

      if (!error && data) {
        return { question: data, isLocal: false };
      }

      // Fallback: check user_recovery table directly
      const { data: tableData } = await supabase
        .from('user_recovery')
        .select('security_question')
        .ilike('email', cleanEmail)
        .limit(1);

      if (tableData && tableData.length > 0 && tableData[0].security_question) {
        return { question: tableData[0].security_question, isLocal: false };
      }
    } catch (e: any) {
      console.warn('ClipStaff: Remote security question check failed:', e);
    }
  }

  return { question: null, isLocal: false, error: 'No account or security question found for this email.' };
}

/**
 * Reset password by verifying security question answer
 */
export async function resetPasswordWithSecurityAnswer(
  email: string,
  answer: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanAnswer = normalizeAnswer(answer);

  if (!cleanEmail || !cleanAnswer || !newPassword) {
    return { success: false, message: 'All fields are required.' };
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  // 1. Check local storage if matching local recovery exists
  try {
    let localData: any = null;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await new Promise<any>((resolve) => chrome.storage.local.get(['clipstaff_security_recovery', 'clipstaff_offline_mode'], resolve));
      localData = res?.clipstaff_security_recovery || {};
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('clipstaff_security_recovery');
      if (raw) localData = JSON.parse(raw);
    }

    const localEntry = localData?.[cleanEmail] || localData?.['local@clipstaff.app'];
    if (localEntry && normalizeAnswer(localEntry.answer) === cleanAnswer) {
      // Update local password
      localEntry.password = newPassword;
      localEntry.updated_at = new Date().toISOString();
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await new Promise<void>((resolve) => chrome.storage.local.set({ clipstaff_security_recovery: localData }, () => resolve()));
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('clipstaff_security_recovery', JSON.stringify(localData));
      }
      return { success: true, message: 'Password reset successfully!' };
    }
  } catch (err) {
    console.warn('ClipStaff: Local reset password check error:', err);
  }

  // 2. Call Supabase RPC function for remote account
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('reset_password_with_security_answer', {
        p_email: cleanEmail,
        p_answer: cleanAnswer,
        p_new_password: newPassword
      });

      if (error) {
        return { success: false, message: error.message || 'Verification failed.' };
      }

      if (data && typeof data === 'object') {
        if (data.success) {
          return { success: true, message: data.message || 'Password updated successfully!' };
        }
        return { success: false, message: data.message || 'Incorrect security answer. Please try again.' };
      }

      return { success: true, message: 'Password updated successfully!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Could not connect to authentication server.' };
    }
  }

  return { success: false, message: 'Incorrect answer or unconfigured security settings.' };
}

/**
 * Save or update security question & answer for an authenticated or local user
 */
export async function saveUserSecurityQuestion(
  question: string,
  answer: string,
  userEmail?: string
): Promise<{ success: boolean; message: string }> {
  const cleanAnswer = normalizeAnswer(answer);
  const cleanQuestion = (question || '').trim();

  if (!cleanQuestion || !cleanAnswer) {
    return { success: false, message: 'Question and answer cannot be empty.' };
  }

  let email = userEmail?.trim().toLowerCase();
  let currentUserId: string | null = null;

  if (isSupabaseConfigured) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      if (!email && user.email) {
        email = user.email.toLowerCase();
      }
    }
  }

  if (!email) {
    email = 'local@clipstaff.app';
  }

  // 1. Save locally
  try {
    let localData: any = {};
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await new Promise<any>((resolve) => chrome.storage.local.get(['clipstaff_security_recovery'], resolve));
      localData = res?.clipstaff_security_recovery || {};
      localData[email] = {
        question: cleanQuestion,
        answer: cleanAnswer,
        updated_at: new Date().toISOString()
      };
      await new Promise<void>((resolve) => chrome.storage.local.set({ clipstaff_security_recovery: localData }, () => resolve()));
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('clipstaff_security_recovery');
      if (raw) localData = JSON.parse(raw);
      localData[email] = {
        question: cleanQuestion,
        answer: cleanAnswer,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('clipstaff_security_recovery', JSON.stringify(localData));
    }
  } catch (err) {
    console.warn('ClipStaff: Failed to save security recovery locally:', err);
  }

  // 2. If Supabase is configured and user is authenticated, save remotely
  if (isSupabaseConfigured && currentUserId && currentUserId !== 'local-user') {
    try {
      // Upsert into user_recovery table
      await supabase
        .from('user_recovery')
        .upsert([
          {
            user_id: currentUserId,
            email: email,
            security_question: cleanQuestion,
            security_answer_hash: cleanAnswer,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'email' });

      // Also update user metadata
      await supabase.auth.updateUser({
        data: {
          security_question: cleanQuestion,
          security_answer: cleanAnswer
        }
      });
    } catch (e: any) {
      console.warn('ClipStaff: Failed to sync security question to Supabase:', e);
    }
  }

  return { success: true, message: 'Security question saved successfully!' };
}

/**
 * Direct password update for logged-in users (no security question required)
 */
export async function changeUserPasswordDirect(newPassword: string): Promise<{ success: boolean; message: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  // If Supabase is configured & authenticated
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Password changed successfully!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to update password.' };
    }
  }

  // Local/Offline mode password update
  try {
    let localData: any = {};
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await new Promise<any>((resolve) => chrome.storage.local.get(['clipstaff_security_recovery'], resolve));
      localData = res?.clipstaff_security_recovery || {};
      if (localData['local@clipstaff.app']) {
        localData['local@clipstaff.app'].password = newPassword;
        localData['local@clipstaff.app'].updated_at = new Date().toISOString();
        await new Promise<void>((resolve) => chrome.storage.local.set({ clipstaff_security_recovery: localData }, () => resolve()));
      }
    }
  } catch {}

  return { success: true, message: 'Password updated successfully!' };
}
