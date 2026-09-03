import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui';
import { Modal } from '../ui/Modal';
import { toast } from 'sonner';
import { useJobsDb } from '../../hooks/useJobsDb';
import { isValidJobUrl, extractCompanyFromUrl, extractRoleFromUrl } from '../../lib/extractor';
import { checkCompanyExclusion } from '../../lib/exclusionHelper';
import { useStore } from '../../store/useStore';
import { Bookmark, AlertTriangle } from 'lucide-react';

interface ManualJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: 'manual' | 'capture';
}

export const ManualJobModal = ({ isOpen, onClose, onSaved, mode }: ManualJobModalProps) => {
  const localDb = useJobsDb();
  const activeProfile = useStore(state => state.activeProfile);
  const candidateExclusions = useStore(state => state.candidateExclusions);
  const globalExclusions = useStore(state => state.globalExclusions);
  
  const [jobUrlInput, setJobUrlInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [roleInput, setRoleInput] = useState('');
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'capture') {
        handleCaptureCurrentTab();
      } else {
        setJobUrlInput('');
        setCompanyInput('');
        setRoleInput('');
      }
    }
  }, [isOpen, mode]);

  const exclusionCheck = useMemo(() => {
    if (!jobUrlInput && !companyInput) return { isExcluded: false };
    return checkCompanyExclusion({
      url: jobUrlInput,
      companyName: companyInput,
      profile: activeProfile,
      candidateExclusions,
      globalExclusions
    });
  }, [jobUrlInput, companyInput, activeProfile, candidateExclusions, globalExclusions]);

  const handleCaptureCurrentTab = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      toast.error('Capture Failed', {
        description: 'Not in a Chrome Extension context.'
      });
      return;
    }

    setScraping(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        toast.error('Capture Failed', {
          description: 'No active tab detected.'
        });
        setScraping(false);
        return;
      }

      if (!isValidJobUrl(tab.url)) {
        toast.error('Not a Job Page', {
          description: 'Saving is restricted for system, communication, search, or social feeds (Gmail, WhatsApp, Google Search, etc.).'
        });
        setScraping(false);
        return;
      }

      setJobUrlInput(tab.url);

      const parsedCompany = extractCompanyFromUrl(tab.url);
      const parsedRole = extractRoleFromUrl(tab.url);

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const metadata = { title: '', company: '' };
          try {
            const scripts = document.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              try {
                const json = JSON.parse(script.textContent || '');
                const objects = Array.isArray(json) ? json : [json];
                for (const obj of objects) {
                  const type = obj['@type'] || obj['type'];
                  if (type === 'JobPosting') {
                    if (obj.title) metadata.title = obj.title;
                    if (obj.hiringOrganization) {
                      if (typeof obj.hiringOrganization === 'string') {
                        metadata.company = obj.hiringOrganization;
                      } else if (obj.hiringOrganization.name) {
                        metadata.company = obj.hiringOrganization.name;
                      }
                    }
                    break;
                  }
                }
              } catch (e) {}
              if (metadata.title && metadata.company) break;
            }

            if (!metadata.title) {
              const ogTitle = document.querySelector('meta[property="og:title"]');
              const twitterTitle = document.querySelector('meta[name="twitter:title"]');
              const metaTitle = document.querySelector('meta[name="title"]');
              metadata.title = ogTitle?.getAttribute('content') || 
                               twitterTitle?.getAttribute('content') || 
                               metaTitle?.getAttribute('content') || '';
            }

            if (!metadata.company) {
              const ogSiteName = document.querySelector('meta[property="og:site_name"]');
              const twitterSite = document.querySelector('meta[name="twitter:site"]');
              metadata.company = ogSiteName?.getAttribute('content') || 
                                twitterSite?.getAttribute('content') || '';
            }

            if (!metadata.title) {
              const h1 = document.querySelector('h1');
              if (h1) metadata.title = h1.textContent?.trim() || '';
            }
          } catch (e) {}
          return metadata;
        }
      }, (results) => {
        const scraped = results?.[0]?.result;

        if (scraped?.company?.trim()) {
          setCompanyInput(scraped.company.trim());
        } else {
          setCompanyInput(parsedCompany);
        }

        let finalRole = '';
        if (scraped?.title?.trim()) {
          finalRole = scraped.title.trim();
        } else if (parsedRole !== 'Job Opportunity') {
          finalRole = parsedRole;
        } else if (tab.title) {
          let cleanTitle = tab.title;
          const delimiters = [' | ', ' - ', ' – ', ' at '];
          for (const delim of delimiters) {
            if (cleanTitle.includes(delim)) {
              cleanTitle = cleanTitle.split(delim)[0];
            }
          }
          finalRole = cleanTitle.trim();
        } else {
          finalRole = 'Job Opportunity';
        }

        setRoleInput(finalRole);
        setScraping(false);

        const companyToCheck = scraped?.company?.trim() || parsedCompany;
        const check = checkCompanyExclusion({
          url: tab.url!,
          companyName: companyToCheck,
          profile: activeProfile,
          candidateExclusions,
          globalExclusions
        });

        if (check.isExcluded) {
          toast.warning('Exclusion Warning', {
            description: check.warningMessage || `"${check.matchedCompany}" is in your profile experience. Do not apply!`
          });
        }
      });

    } catch (err: any) {
      console.error('Failed to capture tab details:', err);
      toast.error('Capture Failed', {
        description: 'An error occurred during tab DOM scanning.'
      });
      setScraping(false);
    }
  };

  const handleAddManualJob = async () => {
    if (!jobUrlInput) {
      toast.error('URL required');
      return;
    }

    if (!isValidJobUrl(jobUrlInput)) {
      toast.error('Not a Job Page', {
        description: 'Saving is restricted for system, communication, search, or social feeds (Gmail, WhatsApp, Google Search, etc.).'
      });
      return;
    }

    if (exclusionCheck.isExcluded) {
      toast.warning('Exclusion: Do Not Apply', {
        description: exclusionCheck.warningMessage || `"${exclusionCheck.matchedCompany}" is listed in your profile experience history. URL cannot be saved.`
      });
      return;
    }

    try {
      await localDb.addJob(jobUrlInput, companyInput, roleInput);
      onSaved();
      onClose();
      toast.success('Job Saved', {
        description: `Added ${roleInput || 'Job'} at ${companyInput || 'Company'} to local IndexedDB.`
      });
    } catch (e: any) {
      toast.error('Save failed', { description: e.message || 'Unknown error' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'capture' ? 'Save Captured Job' : 'Save Job Manually'}
    >
      <div className="space-y-4">
        {scraping ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2 text-ash">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Scraping Page Content...</p>
          </div>
        ) : (
          <>
            {exclusionCheck.isExcluded && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-red-300">
                    Profile Experience Exclusion
                  </span>
                  <p className="text-[11px] leading-relaxed text-red-400">
                    {exclusionCheck.warningMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[8px] font-bold uppercase tracking-wider text-ash">Job URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                  value={jobUrlInput}
                  onChange={(e) => setJobUrlInput(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-ash">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Google"
                    className="w-full px-3.5 py-2.5 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-ash">Role / Position</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full px-3.5 py-2.5 bg-black border border-white/5 rounded-xl text-xs text-white placeholder:text-muted/20 focus:outline-none focus:border-accent/40"
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end pt-3 border-t border-white/5">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              {mode === 'capture' && (
                <Button size="sm" variant="secondary" onClick={handleCaptureCurrentTab} icon={<Bookmark className="w-3 h-3" />}>
                  Re-Capture
                </Button>
              )}
              <Button
                size="sm"
                variant={exclusionCheck.isExcluded ? 'secondary' : 'primary'}
                onClick={handleAddManualJob}
                disabled={exclusionCheck.isExcluded}
                className={exclusionCheck.isExcluded ? 'opacity-50 cursor-not-allowed text-red-400' : ''}
              >
                {exclusionCheck.isExcluded ? 'Exclusion Blocked' : 'Save Application'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
