import React from 'react'
import { Auth } from './components/Auth'
import { useAuth } from './hooks/useAuth'
import { autofillForm } from './lib/autofill'
import { UnifiedVault } from './components/UnifiedVault'
import { ResumeBuilder } from './components/ResumeBuilder'
import { JobList } from './components/JobList'
import { EligibilityChecker } from './components/EligibilityChecker'
import { useProfiles } from './hooks/useProfiles'
import { ProfileDrawer } from './components/ProfileDrawer'
import { Toaster, toast } from 'sonner'
import { 
  User, 
  LogOut, 
  RotateCw,
  Zap,
  FileText,
  X,
  Briefcase,
  ShieldCheck
} from 'lucide-react'
import { useStore } from './store/useStore'
import { syncShortcutsToStorage } from './lib/sync'
import { Button } from './components/ui'

// ClipStaff Logo Component — uses the actual project icon
const ClipStaffLogo = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <img 
    src="/icons/icon128.png" 
    alt="ClipStaff" 
    width={size} 
    height={size} 
    className={`rounded-xl ${className}`}
    style={{ imageRendering: 'auto' }}
  />
);

function MainContent() {
  const { user, signOut } = useAuth();
  const { snippets, dynamicShortcuts, activeProfile, profileTriggers } = useStore();
  const { fetchProfile } = useProfiles();
  const [activeTab, setActiveTab] = React.useState<'vault' | 'resume' | 'jobs' | 'match'>('vault');
  const [profileOpen, setProfileOpen] = React.useState(false);
  
  const isIframe = React.useMemo(() => window.self !== window.top, []);

  // Initial Profile Load
  React.useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user, fetchProfile]);

  // Automatic Shortcut Sync (Manual + Dynamic + Profile)
  React.useEffect(() => {
    if (user) {
      syncShortcutsToStorage(snippets, dynamicShortcuts, activeProfile, profileTriggers);
    }
  }, [snippets, dynamicShortcuts, activeProfile, profileTriggers, user]);

  const handleAutofillPage = async () => {
    if (!activeProfile) {
      toast.error('No Active Profile', {
        description: 'Please connect and save a profile first.'
      });
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        toast.error('Autofill Failed', {
          description: 'No active web page detected.'
        });
        return;
      }
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: autofillForm,
        args: [activeProfile]
      }, (results) => {
        const filled = results?.[0]?.result || 0;
        if (filled > 0) {
          toast.success('Form Autofilled', {
            description: `Successfully populated ${filled} fields.`
          });
        } else {
          toast.info('No Fields Found', {
            description: 'Could not find matching form fields.'
          });
        }
      });
    } catch (err: any) {
      console.error('Autofill error:', err);
      toast.error('Autofill Blocked', {
        description: 'Autofill is restricted on this tab context.'
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-void text-mist overflow-hidden selection:bg-accent/30 selection:text-void">
      {/* Header with ClipStaff Logo */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-graphite bg-carbon">
        <div className="flex items-center gap-3">
          <ClipStaffLogo size={32} />
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-none">ClipStaff</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Profile Icon */}
          <button
            onClick={() => setProfileOpen(true)}
            className="p-2 rounded-md bg-white/5 hover:bg-accent/10 text-ash hover:text-accent active:scale-95 duration-200 transition-all"
            title="My Profile"
          >
            <User className="w-4 h-4" />
          </button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={signOut}
            icon={<LogOut className="w-4 h-4" />}
            className="text-[10px] font-bold tracking-widest active:scale-95 duration-200"
          >
            Sign Out
          </Button>

          {isIframe && (
            <button
              onClick={() => window.parent.postMessage({ type: 'CLOSE_CLIPSTAFF_SIDEBAR' }, '*')}
              className="p-2 rounded-md bg-white/5 hover:bg-red-500/10 text-ash hover:text-red-500 active:scale-95 duration-200 transition-all ml-1"
              title="Close Sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Navigation: Vault + Resume Builder + Jobs + Match */}
      <nav className="flex bg-carbon border-b border-graphite px-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'vault'}
          onClick={() => setActiveTab('vault')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-medium tracking-tight transition-all relative ${
            activeTab === 'vault' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-ash hover:text-mist border-b-2 border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          Vault
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'resume'}
          onClick={() => setActiveTab('resume')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-medium tracking-tight transition-all relative ${
            activeTab === 'resume' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-ash hover:text-mist border-b-2 border-transparent'
          }`}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          Resume
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'jobs'}
          onClick={() => setActiveTab('jobs')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-medium tracking-tight transition-all relative ${
            activeTab === 'jobs' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-ash hover:text-mist border-b-2 border-transparent'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
          Jobs
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'match'}
          onClick={() => setActiveTab('match')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-medium tracking-tight transition-all relative ${
            activeTab === 'match' 
              ? 'text-accent border-b-2 border-accent' 
              : 'text-ash hover:text-mist border-b-2 border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          Match
        </button>
      </nav>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="max-w-2xl mx-auto h-full">
          {activeTab === 'vault' && <UnifiedVault onAutofill={handleAutofillPage} />}
          {activeTab === 'resume' && <ResumeBuilder />}
          {activeTab === 'jobs' && <JobList />}
          {activeTab === 'match' && <EligibilityChecker />}
        </div>
      </main>

      {/* Footer Status */}
      <footer className="p-4 bg-carbon border-t border-graphite">
        <div className="flex items-center justify-between p-3 bg-void rounded-md border border-graphite">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-pulse-green rounded-full animate-pulse" />
            <div className="text-[10px] font-medium text-ash uppercase tracking-wider">System Ready</div>
          </div>
          
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => {
              const state = useStore.getState();
              syncShortcutsToStorage(state.snippets);
              
              chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
                if (response?.status === 'ready') {
                  toast.success('Vault Synced', {
                    description: 'Your manual shortcuts are now active.'
                  });
                } else {
                  toast.info('Refresh Required', {
                    description: 'Please refresh the job portal tab.'
                  });
                }
              });
            }}
            icon={<RotateCw className="w-3 h-3" />}
            className="text-[9px]"
          >
            Sync
          </Button>
        </div>
      </footer>

      {/* Profile Drawer */}
      <ProfileDrawer isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full scale-125 animate-pulse" />
          <ClipStaffLogo size={56} className="relative z-10 animate-bounce" />
        </div>
        <div className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] animate-pulse">Loading ClipStaff</div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-center" theme="dark" closeButton />
      {user ? <MainContent /> : <Auth />}
    </>
  )
}

export default App
