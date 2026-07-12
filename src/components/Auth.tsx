import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your inbox', { description: 'We sent you a verification email.' });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast.success('Reset link sent', { description: 'Please check your email for the password reset link.' });
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6 relative">
      <div className="w-full max-w-sm bg-carbon border border-graphite rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/icons/icon128.png" 
            alt="ClipStaff" 
            width={52} 
            height={52} 
            className="rounded-md shadow-sm mb-4"
          />
          <h2 className="text-xl font-display font-semibold tracking-tight text-paper mb-1">ClipStaff</h2>
          <p className="text-[10px] font-medium text-ash uppercase tracking-wider">Recruiter Assistant</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
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
                  onClick={handleForgotPassword}
                  className="text-[9px] font-bold uppercase tracking-widest text-accent/60 hover:text-accent transition-colors"
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
                required={mode === 'login' || mode === 'signup'}
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

          {error && (
            <div className="p-3 bg-coral-red/5 border border-coral-red/10 rounded-xl">
              <p className="text-[10px] font-medium text-coral-red text-center uppercase tracking-wide">{error}</p>
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

        <div className="mt-8 pt-5 border-t border-graphite flex flex-col items-center">
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-[10px] font-semibold uppercase tracking-wider text-ash hover:text-mist transition-colors"
          >
            {mode === 'login' ? "New to ClipStaff? Register" : "Have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};
