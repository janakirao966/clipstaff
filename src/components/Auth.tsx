import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mail, Lock, ChevronRight, Eye, EyeOff, ShieldCheck, HelpCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { Button, ClipStaffLogo } from './ui';
import { toast } from 'sonner';
import {
  SECURITY_QUESTIONS_PRESETS,
  CUSTOM_QUESTION_TRIGGER,
  fetchUserSecurityQuestion,
  resetPasswordWithSecurityAnswer,
  saveUserSecurityQuestion
} from '../lib/securityQuestions';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Sign Up Security Question State
  const [selectedQuestion, setSelectedQuestion] = useState<string>(SECURITY_QUESTIONS_PRESETS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Forgot Password Flow State
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [retrievedQuestion, setRetrievedQuestion] = useState<string | null>(null);
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const getEffectiveSignupQuestion = () => {
    return selectedQuestion === CUSTOM_QUESTION_TRIGGER ? customQuestion.trim() : selectedQuestion;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError("Supabase cloud keys are not configured. Click 'Continue in Local / Offline Mode' below to use the extension locally.");
      setLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        localStorage.removeItem('clipstaff_offline_mode');
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.remove(['clipstaff_offline_mode'], () => {});
        }
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const effectiveQuestion = getEffectiveSignupQuestion();
        if (!effectiveQuestion) {
          setError('Please select or write a security question');
          setLoading(false);
          return;
        }

        if (!securityAnswer.trim()) {
          setError('Please provide an answer to your security question');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              security_question: effectiveQuestion,
              security_answer: securityAnswer.trim().toLowerCase()
            }
          }
        });

        if (error) throw error;

        // Save security question in recovery store
        await saveUserSecurityQuestion(effectiveQuestion, securityAnswer, email.trim());

        localStorage.removeItem('clipstaff_offline_mode');
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.remove(['clipstaff_offline_mode'], () => {});
        }

        if (data.session) {
          toast.success('Account Created', { description: 'Welcome to ClipStaff!' });
        } else {
          toast.success('Check your inbox', { description: 'We sent you a verification email.' });
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed';
      if (msg.toLowerCase().includes('failed to fetch')) {
        setError("Cannot connect to Supabase server. Please verify your internet connection or click 'Continue in Local / Offline Mode' below.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Find security question for entered email
  const handleFetchSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchUserSecurityQuestion(email.trim());
      if (result.error || !result.question) {
        setError(result.error || 'No security question found for this account. Please check the email.');
        return;
      }

      setRetrievedQuestion(result.question);
      setForgotStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve security question.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Answer & Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!forgotAnswer.trim()) {
      setError('Please enter your security answer');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordWithSecurityAnswer(
        email.trim(),
        forgotAnswer.trim(),
        newPassword
      );

      if (!result.success) {
        setError(result.message || 'Incorrect answer. Please try again.');
        return;
      }

      toast.success('Password Reset Successful!', {
        description: 'You can now log in with your new password.'
      });

      // Reset forgot state & prefill login
      setPassword('');
      setForgotStep(1);
      setRetrievedQuestion(null);
      setForgotAnswer('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6 relative">
      <div className="w-full max-w-sm bg-carbon border border-graphite rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <ClipStaffLogo size={52} animateMotion="swing" withGlow glowColor="rgba(228, 242, 34, 0.3)" className="mb-3" />
          <h2 className="text-xl font-display font-semibold tracking-tight text-paper mb-0.5">ClipStaff</h2>
          <p className="text-[10px] font-medium text-ash uppercase tracking-wider">Recruiter Assistant</p>
        </div>

        {/* FORGOT PASSWORD MODE */}
        {mode === 'forgot' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setForgotStep(1);
                  setError(null);
                }}
                className="p-1 rounded-md text-ash hover:text-mist hover:bg-white/5 transition-colors"
                title="Back to login"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-xs font-bold uppercase tracking-wider text-paper flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-accent" />
                Reset Password
              </h3>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleFetchSecurityQuestion} className="space-y-4">
                <p className="text-[11px] text-ash leading-relaxed">
                  Enter your registered email address to verify your security question and set a new password.
                </p>

                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="name@company.com"
                      className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-coral-red/5 border border-coral-red/10 rounded-xl">
                    <p className="text-[10px] font-medium text-coral-red text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={loading}
                  icon={<ChevronRight className="w-4 h-4" />}
                  className="w-full py-3 text-[10px] font-bold tracking-widest"
                >
                  VERIFY EMAIL & PROCEED
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Security Question Banner */}
                <div className="p-3.5 bg-accent/5 border border-accent/20 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-accent text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Your Security Question</span>
                  </div>
                  <p className="text-xs text-paper font-medium leading-snug">
                    "{retrievedQuestion}"
                  </p>
                </div>

                {/* Security Answer */}
                <div className="space-y-1.5">
                  <label htmlFor="forgot-answer" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">
                    Your Security Answer
                  </label>
                  <div className="relative group">
                    <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                    <input
                      id="forgot-answer"
                      type="text"
                      placeholder="Enter your answer"
                      className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                      value={forgotAnswer}
                      onChange={(e) => setForgotAnswer(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">
                    New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                    <input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-12 pr-12 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ash hover:text-mist transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">
                    Confirm New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                    <input
                      id="confirm-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-coral-red/5 border border-coral-red/10 rounded-xl">
                    <p className="text-[10px] font-medium text-coral-red text-center">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={loading}
                  icon={<ChevronRight className="w-4 h-4" />}
                  className="w-full py-3 text-[10px] font-bold tracking-widest"
                >
                  RESET PASSWORD & LOGIN
                </Button>
              </form>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setForgotStep(1);
                  setError(null);
                }}
                className="text-[10px] font-semibold uppercase tracking-wider text-ash hover:text-mist transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN & SIGNUP MODES */
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label htmlFor="auth-password" className="text-[10px] font-medium uppercase tracking-wider text-ash">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep(1);
                      setError(null);
                    }}
                    className="text-[9px] font-bold uppercase tracking-widest text-accent/70 hover:text-accent transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your password"
                  className="w-full pl-12 pr-12 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ash hover:text-mist transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SIGNUP SECURITY QUESTION FIELDS */}
            {mode === 'signup' && (
              <div className="space-y-3 pt-2 border-t border-graphite/60 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <label htmlFor="security-question" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-accent" />
                    Security Question (For Recovery)
                  </label>
                  <select
                    id="security-question"
                    value={selectedQuestion}
                    onChange={(e) => setSelectedQuestion(e.target.value)}
                    className="w-full px-3 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist focus:outline-none focus:border-accent/50 transition-all cursor-pointer"
                  >
                    {SECURITY_QUESTIONS_PRESETS.map((q, idx) => (
                      <option key={idx} value={q} className="bg-carbon text-mist">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedQuestion === CUSTOM_QUESTION_TRIGGER && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label htmlFor="custom-question" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">
                      Your Custom Question
                    </label>
                    <input
                      id="custom-question"
                      type="text"
                      placeholder="e.g. What is my favorite vacation spot?"
                      className="w-full px-3 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="security-answer" className="text-[10px] font-medium uppercase tracking-wider text-ash ml-1">
                    Security Answer
                  </label>
                  <div className="relative group">
                    <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ash group-focus-within:text-accent transition-colors" />
                    <input
                      id="security-answer"
                      type="text"
                      placeholder="Your secret answer"
                      className="w-full pl-12 pr-4 py-2.5 bg-void border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-bone transition-all"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-coral-red/5 border border-coral-red/10 rounded-xl">
                <p className="text-[10px] font-medium text-coral-red text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              isLoading={loading}
              icon={<ChevronRight className="w-4 h-4" />}
              className="w-full py-3 text-[10px] font-bold tracking-widest"
            >
              {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </Button>
          </form>
        )}

        {mode !== 'forgot' && (
          <div className="mt-5 pt-4 border-t border-graphite flex flex-col items-center gap-3">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-[10px] font-semibold uppercase tracking-wider text-ash hover:text-mist transition-colors"
            >
              {mode === 'login' ? "New to ClipStaff? Register" : "Have an account? Sign In"}
            </button>

            <div className="w-full flex items-center gap-2 my-0.5">
              <div className="flex-1 h-[1px] bg-graphite" />
              <span className="text-[9px] uppercase tracking-widest text-ash/60 font-semibold">or</span>
              <div className="flex-1 h-[1px] bg-graphite" />
            </div>

            <button
              type="button"
              onClick={() => {
                localStorage.setItem('clipstaff_offline_mode', 'true');
                if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                  chrome.storage.local.set({ clipstaff_offline_mode: true }, () => {
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }}
              className="w-full py-2.5 px-3 bg-white/5 hover:bg-accent/10 border border-white/10 hover:border-accent/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-ash hover:text-accent transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Continue in Local / Offline Mode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
