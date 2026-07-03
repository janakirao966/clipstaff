import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { 
  ClipboardPaste, Loader2, Key, Play, ChevronDown, ChevronUp
} from 'lucide-react';

export const EligibilityChecker = () => {
  const { 
    geminiApiKey, 
    setGeminiApiKey,
    checkerJdText, 
    setCheckerJdText,
    lastEligibilityResult, 
    setLastEligibilityResult,
    activeProfile,
    resumeText
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showApiSettings, setShowApiSettings] = useState(!geminiApiKey);

  // Grabs highlighted text from the active tab context
  const grabSelectedText = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        toast.error('No active tab detected');
        return;
      }
      
      // Execute selection extraction script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || ""
      }, (results) => {
        const text = results?.[0]?.result;
        if (text && text.trim()) {
          setCheckerJdText(text.trim());
          toast.success('Highlighted text captured!');
        } else {
          toast.info('No text selected', {
            description: 'Please select/highlight the Job Description text on the page first.'
          });
        }
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Could not capture selection: ' + err.message);
    }
  };

  // Run AI analysis using Gemini API
  const analyzeEligibility = async () => {
    if (!geminiApiKey.trim()) {
      toast.error('API Key required', {
        description: 'Please save a Gemini API Key in the settings panel above.'
      });
      setShowApiSettings(true);
      return;
    }
    if (!checkerJdText.trim()) {
      toast.error('Job Description required', {
        description: 'Please paste or grab a job description first.'
      });
      return;
    }

    setLoading(true);
    try {
      const activeCandidateName = activeProfile?.full_name || 'Active Candidate';
      const activeCandidateResume = resumeText.trim() || '(No resume details provided. Focus eligibility check purely on exclusions)';

      const prompt = `You are an ATS expert specializing in evaluating job descriptions against strict exclusion criteria and resume alignment requirements.
Analyze the provided Job Description and compare it against the active candidate's resume (if provided). Determine eligibility based on these rules:

## 1. Global Exclusion Criteria
Exclude any roles associated with the following companies:
* KPMG
* Infosys
* Deloitte
* Fidelity
* Amazon
* BW Design Group
* FLUOR Corporation
* TATA Motors
* Saulsbury
* Targa Resources
* MEL Systems
* BAE Systems
* Any State/Government agencies

Exclude any roles in the following sectors:
* Management & Consulting
* Government Projects
* Aerospace / Defense

Exclude any roles that:
* Require U.S. Citizenship
* Require Visa Sponsorship or H-1B Sponsorship
* Are United Nations (UN) jobs

## 2. Person-Specific Exclusion Mapping
In addition to the global exclusions, determine eligibility separately for the following individuals:

### Mounika
Not eligible if the company is:
* BW Design Group
* FLUOR Corporation
* TATA Motors

### Pravilika
Not eligible if the company is:
* Saulsbury
* Targa Resources
* MEL Systems

### Hardhik
Not eligible if the company is:
* BW Design Group
* BAE Systems
* TATA Motors

Calculate the ATS Match Score ONLY for the active candidate:
- Candidate Name: ${activeCandidateName}
- Resume Text: ${activeCandidateResume}

Return the response in EXACTLY this JSON structure:
{
  "eligibility": "Eligible" | "Not Eligible",
  "reasoning": {
    "company": "Triggered" | "Not Triggered",
    "sector": "Triggered" | "Not Triggered",
    "requirement": "Triggered" | "Not Triggered",
    "notes": "Brief explanation"
  },
  "userStatus": {
    "mounika": "Eligible" | "Not Eligible",
    "pravilika": "Eligible" | "Not Eligible",
    "hardhik": "Eligible" | "Not Eligible"
  },
  "atsScore": number (0 to 100)
}

### JOB DESCRIPTION:
${checkerJdText}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error?.message || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      const contentText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error('Empty response returned from Gemini API');
      }

      const parsedResult = JSON.parse(contentText.trim());
      setLastEligibilityResult(parsedResult);
      toast.success('Eligibility check complete!');
    } catch (err: any) {
      console.error(err);
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setShowApiSettings(false);
    toast.success('Gemini API Key saved!');
  };

  // Helper to color codes
  const getBadgeColor = (val: string) => {
    return val === 'Eligible' || val === 'Not Triggered'
      ? 'bg-green-500/10 text-green-400 border-green-500/20'
      : 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Gemini API Settings */}
      <div className="border border-graphite rounded-2xl bg-carbon overflow-hidden">
        <button 
          onClick={() => setShowApiSettings(!showApiSettings)}
          className="w-full px-4 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ash border-b border-graphite/40 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-accent" />
            <span>Gemini API Setup</span>
          </div>
          {showApiSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showApiSettings && (
          <div className="p-4 space-y-3 bg-void">
            <p className="text-[10px] text-fog leading-relaxed">
              Exclusions and ATS match checking requires a Gemini API Key. Keys are saved locally on your device and are never sent to external servers.
            </p>
            <div className="relative">
              <input 
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-carbon border border-graphite rounded-md text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40"
              />
            </div>
            <Button size="sm" onClick={handleSaveApiKey} className="w-full">
              Save Key
            </Button>
          </div>
        )}
      </div>

      {/* Input JD section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-ash">Target Job Description</h3>
            <p className="text-[9px] text-fog">Highlight text on any tab and grab it below.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={grabSelectedText} icon={<ClipboardPaste className="w-3 h-3" />} className="text-[9px] py-1.5">
            Grab Selection
          </Button>
        </div>

        <textarea 
          rows={6}
          placeholder="Paste Job Description here, or select/highlight text on a webpage and click 'Grab Selection' above..."
          value={checkerJdText}
          onChange={(e) => setCheckerJdText(e.target.value)}
          className="w-full px-4 py-3 bg-carbon border border-graphite rounded-md text-xs text-white placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
        />

        <Button 
          onClick={analyzeEligibility} 
          isLoading={loading}
          icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} 
          className="w-full py-3 text-xs"
        >
          {loading ? 'Analyzing Exclusions...' : 'Analyze Eligibility'}
        </Button>
      </div>

      {/* Results Dashboard */}
      {lastEligibilityResult && (
        <Card className="border-accent/20 bg-accent/5 p-4 space-y-4 animate-in fade-in duration-500">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-graphite pb-3">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Eligibility Determination</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded border ${getBadgeColor(lastEligibilityResult.eligibility)}`}>
                  {lastEligibilityResult.eligibility}
                </span>
              </div>
            </div>
            {/* ATS match score for active profile */}
            {lastEligibilityResult.atsScore !== undefined && (
              <div className="text-right">
                <span className="text-[9px] font-bold text-ash uppercase tracking-widest block">ATS Match Score</span>
                <span className="text-base font-black text-white">{lastEligibilityResult.atsScore}%</span>
                <span className="text-[8px] text-fog block truncate max-w-[120px]" title={activeProfile?.full_name || 'Active Candidate'}>
                  ({activeProfile?.full_name || 'Active Candidate'})
                </span>
              </div>
            )}
          </div>

          {/* Reasoning Checklist */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-ash">Triggered Exclusions</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2 rounded border text-center text-[10px] font-bold ${getBadgeColor(lastEligibilityResult.reasoning.company === 'Triggered' ? 'Not Eligible' : 'Eligible')}`}>
                <span className="block text-[8px] text-fog font-medium uppercase tracking-wider mb-0.5">Company</span>
                {lastEligibilityResult.reasoning.company === 'Triggered' ? '❌ Triggered' : '✅ Clear'}
              </div>
              <div className={`p-2 rounded border text-center text-[10px] font-bold ${getBadgeColor(lastEligibilityResult.reasoning.sector === 'Triggered' ? 'Not Eligible' : 'Eligible')}`}>
                <span className="block text-[8px] text-fog font-medium uppercase tracking-wider mb-0.5">Sector</span>
                {lastEligibilityResult.reasoning.sector === 'Triggered' ? '❌ Triggered' : '✅ Clear'}
              </div>
              <div className={`p-2 rounded border text-center text-[10px] font-bold ${getBadgeColor(lastEligibilityResult.reasoning.requirement === 'Triggered' ? 'Not Eligible' : 'Eligible')}`}>
                <span className="block text-[8px] text-fog font-medium uppercase tracking-wider mb-0.5">Requirement</span>
                {lastEligibilityResult.reasoning.requirement === 'Triggered' ? '❌ Triggered' : '✅ Clear'}
              </div>
            </div>
            {lastEligibilityResult.reasoning.notes && (
              <div className="bg-void border border-graphite p-3 rounded-md mt-2">
                <span className="text-[8px] font-bold uppercase tracking-wider text-accent block mb-1">Additional Notes</span>
                <p className="text-[10px] text-mist leading-relaxed">{lastEligibilityResult.reasoning.notes}</p>
              </div>
            )}
          </div>

          {/* User-Specific status mappings */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-ash">Client Specific Status</h4>
            <div className="space-y-1.5">
              {lastEligibilityResult.userStatus && Object.keys(lastEligibilityResult.userStatus).map((name) => {
                const status = lastEligibilityResult.userStatus[name];
                return (
                  <div key={name} className="flex items-center justify-between p-2.5 bg-void border border-graphite rounded-md">
                    <span className="text-xs font-bold text-white capitalize">{name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getBadgeColor(status)}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </Card>
      )}

    </div>
  );
};
