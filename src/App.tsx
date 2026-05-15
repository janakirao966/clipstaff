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
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto bg-white shadow-2xl relative">
      {/* Header */}
      <header className="flex items-center justify-between px-md py-3 bg-accent text-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-1 rounded-md">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold tracking-tight">ClipStaff</h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => signOut()}
            className="p-1.5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center border-b border-slate-100 bg-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'profiles' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Profiles</span>
        </button>
        <button
          onClick={() => setActiveTab('snippets')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'snippets' 
              ? 'border-accent text-accent' 
              : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Snippets</span>
        </button>
      </nav>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative bg-slate-50/30">
        {activeTab === 'profiles' ? <ProfileList /> : <SnippetList />}
      </main>

      {/* Footer */}
      <footer className="px-md py-2 bg-white border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[100px]">{user.email}</span>
          <span className="text-slate-200">|</span>
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
            className="hover:text-accent transition-colors"
          >
            Verify Bridge
          </button>
        </div>
        <span className="font-mono">v0.1.0</span>
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
