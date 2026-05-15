import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, AlertCircle, Loader2, Briefcase } from 'lucide-react';

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
    <div className="min-h-[600px] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 -right-24 w-64 h-64 bg-secondary/5 rounded-full blur-[100px] animate-pulse delay-700 pointer-events-none" />
      
      <div className="w-full relative z-10">
        <div className="bg-surface/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8 shadow-2xl">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-premium rounded-2xl flex items-center justify-center shadow-accent-glow mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-[800] tracking-tighter text-white mb-1">ClipStaff</h1>
            <p className="text-muted text-[10px] font-black tracking-[0.2em] uppercase opacity-60">The Recruiter's Edge</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Work Email</label>
                <input
                  type="email"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder:text-muted/30 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-all duration-300"
                  placeholder="alex@recruitment.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted ml-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-sm text-white placeholder:text-muted/30 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 transition-all duration-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] font-bold text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-premium hover:shadow-accent-glow text-white font-display font-bold py-4 rounded-xl transition-all duration-500 flex items-center justify-center gap-3 disabled:opacity-50 group"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="tracking-tight text-sm uppercase font-black">{mode === 'login' ? 'Dashboard Access' : 'Create Vault'}</span>
                  <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-muted hover:text-white text-[10px] font-black transition-colors tracking-widest uppercase"
            >
              {mode === 'login' ? (
                <>New Here? <span className="text-accent-light ml-1">Initialize Vault</span></>
              ) : (
                <>Member? <span className="text-accent-light ml-1">Terminal Login</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
