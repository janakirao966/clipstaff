import React from 'react'
import { LogOut, User as UserIcon, Hash, Briefcase } from 'lucide-react'
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
    <div className="flex flex-col min-h-screen bg-[#020202] font-sans selection:bg-accent/30 selection:text-white">
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto bg-background/80 backdrop-blur-3xl border-x border-white/5 relative shadow-2xl">
        
        {/* Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-5 bg-background/40 backdrop-blur-md border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-premium rounded-xl flex items-center justify-center shadow-accent-glow transform hover:scale-105 transition-transform duration-300">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-extrabold tracking-tighter text-white">ClipStaff</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">Active Bridge</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => signOut()}
              className="group p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-all duration-300 border border-white/5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </header>
 
        {/* Tabs */}
        <nav className="flex p-2 gap-1 bg-surface/50 backdrop-blur-sm border-b border-white/5 flex-shrink-0">
          {[
            { id: 'profiles', label: 'Profiles', icon: UserIcon },
            { id: 'snippets', label: 'Snippets', icon: Hash },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-500 ${
                activeTab === tab.id 
                  ? 'bg-gradient-premium text-white shadow-lg shadow-accent/20' 
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 transition-transform duration-500 ${activeTab === tab.id ? 'scale-110' : ''}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
 
        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto scrollbar-hide pb-24">
            {activeTab === 'profiles' ? <ProfileList /> : <SnippetList />}
          </div>
          
          {/* Bottom Gradient Fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
        </main>
 
        {/* Footer */}
        <footer className="absolute bottom-6 left-6 right-6 z-20">
          <div className="bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/20">
                <span className="text-[10px] font-bold text-accent">{user.email?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{user.email}</span>
                <span className="text-[9px] font-medium text-muted uppercase tracking-tighter">Professional Plan</span>
              </div>
            </div>
            <button 
              onClick={() => {
                chrome.runtime.sendMessage(
                  { target: 'content-script', data: { type: 'PING' } },
                  (response) => {
                    if (response?.type === 'PONG') {
                      alert('Bridge Verified: Content Script Connected!');
                    } else {
                      alert('Bridge Failed: ' + (response?.error || 'No response'));
                    }
                  }
                );
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-accent hover:text-white text-[9px] font-black uppercase tracking-widest text-muted rounded-lg border border-white/5 transition-all duration-300"
            >
              Sync
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
      <Toaster position="bottom-center" richColors expand closeButton duration={2000} />
    </AuthProvider>
  )
}

export default App
