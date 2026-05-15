import React from 'react'
import { LogOut, User as UserIcon, Hash, Briefcase, Zap } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import { Auth } from './components/Auth'
import { ProfileList } from './components/ProfileList'
import { SnippetList } from './components/SnippetList'

function MainContent() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'profiles' | 'snippets'>('profiles');

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-sans selection:bg-accent/30 overflow-hidden">
      {/* Root Shell */}
      <div className="flex-1 flex flex-col w-full max-w-[450px] mx-auto bg-[#050505] border-x border-white/5 relative shadow-[0_0_100px_rgba(0,0,0,1)]">
        
        {/* Elite Header */}
        <header className="px-6 pt-10 pb-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-gradient-premium rounded-xl flex items-center justify-center shadow-accent-glow transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black tracking-tighter leading-none mb-1">ClipStaff</h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted group-hover:text-white transition-colors">Operational • v0.0.1</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => signOut()}
              className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/10 text-muted hover:text-red-400 rounded-xl border border-white/5 transition-all duration-300"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Tab Selection */}
        <nav className="flex px-6 mb-6 gap-2">
          {[
            { id: 'profiles', label: 'Profiles', icon: UserIcon },
            { id: 'snippets', label: 'Vault', icon: Hash },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-display font-bold transition-all duration-300 border ${
                activeTab === tab.id 
                  ? 'bg-white/5 border-white/20 text-white shadow-premium' 
                  : 'bg-transparent border-transparent text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-accent' : ''}`} />
              <span className="tracking-tight">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Dynamic content scroll area */}
        <main className="flex-1 overflow-y-auto px-4 pb-32 scrollbar-hide">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {activeTab === 'profiles' ? <ProfileList /> : <SnippetList />}
          </div>
        </main>

        {/* Tactical Footer Overlay */}
        <footer className="absolute bottom-6 left-6 right-6 z-20">
          <div className="bg-[#0A0A0A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                <span className="text-xs font-black text-white">{user.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white truncate max-w-[120px]">{user.email}</span>
                <span className="text-[9px] font-mono text-muted uppercase tracking-tighter">Session Active</span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
                  if (response?.status === 'ready') {
                    alert('Expansion Bridge Verified');
                  }
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-xl border border-accent/20 transition-all duration-300"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Sync</span>
            </button>
          </div>
        </footer>

        {/* Top/Bottom Structural Accents */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
      <Toaster position="bottom-center" richColors theme="dark" />
    </AuthProvider>
  )
}

export default App
