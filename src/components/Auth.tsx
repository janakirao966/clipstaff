import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-md space-y-lg">
      <div className="text-center space-y-xs">
        <h2 className="text-display font-bold text-accent">
          {mode === 'login' ? 'Welcome Back' : 'Get Started'}
        </h2>
        <p className="text-sm text-slate-500">
          {mode === 'login' 
            ? 'Sign in to access your professional profiles' 
            : 'Create an account to speed up your job applications'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="w-full space-y-md">
        {error && (
          <div className={`flex items-start gap-sm p-sm rounded-md border text-sm ${
            error.includes('Check your email') 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-red-50 border-red-200 text-destructive'
          }`}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-sm">
          <div className="space-y-xs">
            <label className="text-label text-slate-600 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-sm py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder="name@company.com"
            />
          </div>

          <div className="space-y-xs">
            <label className="text-label text-slate-600 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-sm py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-sm bg-accent text-white py-2 rounded-md font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'login' ? (
            <>
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Profile</span>
            </>
          )}
        </button>
      </form>

      <div className="pt-md text-center">
        <p className="text-sm text-slate-500">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-accent font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};
