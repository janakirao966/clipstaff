import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button, Card } from './ui';
import { toast } from 'sonner';
import { 
  ClipboardPaste, Loader2, Key, ChevronDown, ChevronUp,
  Sparkles, Copy, Check, Sliders, Plus, Target, CheckCircle2, XCircle,
  Wrench, Layers, Award
} from 'lucide-react';
import { 
  EligibilityResult, 
  buildCandidateProfileSummary, 
  extractAllMissingKeywords 
} from '../lib/atsHelper';

export const EligibilityChecker = () => {
  const geminiApiKey = useStore(state => state.geminiApiKey);
  const setGeminiApiKey = useStore(state => state.setGeminiApiKey);
  const selectedGeminiModel = useStore(state => state.selectedGeminiModel) || 'gemini-2.5-flash';
  const setSelectedGeminiModel = useStore(state => state.setSelectedGeminiModel);
  const checkerJdText = useStore(state => state.checkerJdText);
  const setCheckerJdText = useStore(state => state.setCheckerJdText);
  const lastEligibilityResult = useStore(state => state.lastEligibilityResult);
  const setLastEligibilityResult = useStore(state => state.setLastEligibilityResult);
  const activeProfile = useStore(state => state.activeProfile);
  const resumeText = useStore(state => state.resumeText);

  // Exclusion settings
  const globalExclusions = useStore(state => state.globalExclusions);
  const setGlobalExclusions = useStore(state => state.setGlobalExclusions);
  const sectorExclusions = useStore(state => state.sectorExclusions);
  const setSectorExclusions = useStore(state => state.setSectorExclusions);
  const candidateExclusions = useStore(state => state.candidateExclusions);

  // Tailoring states
  const tailoredBullets = useStore(state => state.tailoredBullets);
  const setTailoredBullets = useStore(state => state.setTailoredBullets);
  const tailoredCoverLetter = useStore(state => state.tailoredCoverLetter);
  const setTailoredCoverLetter = useStore(state => state.setTailoredCoverLetter);

  const typedResult = lastEligibilityResult as EligibilityResult | null;

  const [loading, setLoading] = useState(false);
  const [tailoringLoading, setTailoringLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showApiSettings, setShowApiSettings] = useState(!geminiApiKey);
  const [showRuleSettings, setShowRuleSettings] = useState(false);
  const [copiedBulletIdx, setCopiedBulletIdx] = useState<number | null>(null);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [copiedMissingKeywords, setCopiedMissingKeywords] = useState(false);

  // New exclusion inputs
  const [newCompany, setNewCompany] = useState('');

  // Grabs highlighted text from the active tab context
  const grabSelectedText = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) {
        toast.error('No active tab detected');
        return;
      }

      const url = tab.url || '';
      const isRestricted = url.startsWith('chrome://') || 
                           url.startsWith('chrome-extension://') || 
                           url.startsWith('about:') || 
                           url.startsWith('file://') ||
                           url.includes('chrome.google.com/webstore');
      if (isRestricted) {
        toast.error('Capture Blocked', {
          description: 'Text capture is restricted on Chrome system or store pages.'
        });
        return;
      }
      
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

  // Helper to execute Gemini request with model fallback
  const executeGeminiRequest = async (promptText: string) => {
    const modelsToTry = [
      selectedGeminiModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });

        if (res.ok) {
          const resData = await res.json();
          const contentText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (contentText) {
            return JSON.parse(contentText.trim());
          }
        } else {
          const errBody = await res.json();
          lastError = new Error(errBody.error?.message || `HTTP ${res.status}`);
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to communicate with Gemini API');
  };

  // Run AI analysis using Gemini API with ATS Keyword & Gap Analyzer
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
      const activeCandidateName = activeProfile?.full_name || activeProfile?.name || 'Active Candidate';
      const candidateProfileSummary = buildCandidateProfileSummary(activeProfile, resumeText);

      // Dynamically construct exclusions prompt
      const globalCompanyList = globalExclusions.map(c => `* ${c}`).join('\n');
      const globalSectorList = sectorExclusions.map(s => `* ${s}`).join('\n');
      
      const candidateKeys = Object.keys(candidateExclusions);
      const candidateExclusionPrompt = candidateKeys.length > 0
        ? candidateKeys.map(name => {
            const list = candidateExclusions[name].map(c => `* ${c}`).join('\n');
            return `### ${name}\nNot eligible if the company is:\n${list}`;
          }).join('\n\n')
        : '';

      const userStatusSchema = candidateKeys.length > 0
        ? candidateKeys.map(name => `"${name.toLowerCase()}": "Eligible" | "Not Eligible"`).join(',\n    ')
        : `"${activeCandidateName.toLowerCase()}": "Eligible" | "Not Eligible"`;

      const prompt = `You are a world-class ATS (Applicant Tracking System) Specialist and Executive Technical Recruiter.
Analyze the provided Job Description against the active candidate's complete background and determine both Exclusion Eligibility and an in-depth ATS Keyword & Skill Gap Breakdown.

## 1. Global Exclusion Criteria
Exclude any roles associated with the following companies:
${globalCompanyList}

Exclude any roles in the following sectors:
${globalSectorList}

Exclude any roles that:
* Require U.S. Citizenship
* Require Visa Sponsorship or H-1B Sponsorship
* Are United Nations (UN) jobs
${candidateExclusionPrompt ? `\n## 2. Person-Specific Exclusion Mapping\nIn addition to the global exclusions, determine eligibility separately for the following individuals:\n${candidateExclusionPrompt}\n` : ''}

## 3. Candidate Background Details
- Candidate Name: ${activeCandidateName}
${candidateProfileSummary}

## 4. ATS Keyword & Skill Gap Analysis Instructions
1. Calculate a concrete ATS Match Score from 0 to 100 based on technical and experience alignment.
2. Provide a 1-2 sentence high-level match summary.
3. Categorize all required skills and competencies extracted from the Job Description into three distinct buckets:
   - "coreSkills": Primary technical languages, architecture, core engineering methodologies (e.g. Python, SQL, Distributed Systems, API Design).
   - "toolsAndFrameworks": Frameworks, cloud tools, databases, devops tooling (e.g. React, Docker, AWS Lambda, PostgreSQL, Kubernetes).
   - "domainAndCertifications": Domain knowledge, business domain expertise, and formal certifications (e.g. Healthcare HIPAA, FinTech, AWS Solutions Architect, Agile/Scrum).
4. For each category, divide the keywords into:
   - "matched": Skills and keywords present or strongly evidenced in the candidate's background.
   - "missing": Critical skills or requirements mentioned in the JD that are not evident in the candidate's profile.

Return the response in EXACTLY this JSON structure:
{
  "eligibility": "Eligible" | "Not Eligible",
  "reasoning": {
    "company": "Triggered" | "Not Triggered",
    "sector": "Triggered" | "Not Triggered",
    "requirement": "Triggered" | "Not Triggered",
    "notes": "Brief explanation of any triggered exclusion or clear status"
  },
  "userStatus": {
    ${userStatusSchema}
  },
  "atsScore": 85,
  "matchSummary": "Strong alignment with core backend stack and cloud requirements, but missing Kubernetes and Snowflake experience.",
  "keywordBreakdown": {
    "coreSkills": {
      "matched": ["Python", "SQL", "ETL Pipelines"],
      "missing": ["Distributed Systems Architecture"]
    },
    "toolsAndFrameworks": {
      "matched": ["AWS", "Docker", "PostgreSQL"],
      "missing": ["Kubernetes", "Snowflake"]
    },
    "domainAndCertifications": {
      "matched": ["Agile / Scrum"],
      "missing": ["AWS Solutions Architect Certification"]
    }
  }
}

### TARGET JOB DESCRIPTION:
${checkerJdText}`;

      const parsedResult: EligibilityResult = await executeGeminiRequest(prompt);
      setLastEligibilityResult(parsedResult);
      toast.success('ATS Analysis & Eligibility Check Complete!');
    } catch (err: any) {
      console.error(err);
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate Tailored Bullets & Cover Letter
  const generateTailoredApplication = async () => {
    if (!geminiApiKey.trim()) {
      toast.error('API Key required');
      setShowApiSettings(true);
      return;
    }
    if (!checkerJdText.trim()) {
      toast.error('Job Description required');
      return;
    }

    setTailoringLoading(true);
    try {
      const activeCandidateName = activeProfile?.full_name || activeProfile?.name || 'Candidate';
      const activeCandidateTitle = activeProfile?.professional_subtitle || 'Software Professional';
      const candidateProfileSummary = buildCandidateProfileSummary(activeProfile, resumeText);

      // Extract missing keywords to guide targeted bullet synthesis
      const missingKeywords = extractAllMissingKeywords(typedResult?.keywordBreakdown);
      const missingContext = missingKeywords.length > 0 
        ? `\nFocus on bridging these missing JD keywords where relevant to the candidate's background:\n${missingKeywords.join(', ')}`
        : '';

      const prompt = `You are a world-class executive recruiter and ATS resume specialist.
Given the candidate's background and the target job description, generate:
1. Three (3) powerful, high-impact resume bullet points tailored specifically to match the skills, keywords, and responsibilities in the job description while staying true to the candidate's experience. Format each with strong action verbs and quantified impact metrics where feasible.${missingContext}
2. A compelling, concise 3-paragraph Cover Letter customized for this role and company.

Candidate Profile:
Name: ${activeCandidateName}
Title: ${activeCandidateTitle}
${candidateProfileSummary}

Job Description:
${checkerJdText}

Return response in EXACTLY this JSON format:
{
  "tailoredBullets": [
    "bullet point 1...",
    "bullet point 2...",
    "bullet point 3..."
  ],
  "coverLetter": "Full formatted cover letter text with paragraphs..."
}`;

      const result = await executeGeminiRequest(prompt);
      if (result.tailoredBullets) {
        setTailoredBullets(result.tailoredBullets);
      }
      if (result.coverLetter) {
        setTailoredCoverLetter(result.coverLetter);
      }

      toast.success('Tailored Bullets & Cover Letter Generated!', {
        description: 'Shortcuts "cover;" and "cl;" are now live with your tailored letter.'
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Tailoring failed: ' + err.message);
    } finally {
      setTailoringLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setShowApiSettings(false);
    toast.success('Gemini API settings saved!');
  };

  const copyToClipboard = (text: string, onDone: () => void) => {
    navigator.clipboard.writeText(text);
    onDone();
    toast.success('Copied to clipboard!');
  };

  const handleCopyAllMissingKeywords = () => {
    const missing = extractAllMissingKeywords(typedResult?.keywordBreakdown);
    if (missing.length === 0) {
      toast.info('No missing keywords found!');
      return;
    }
    const text = missing.join(', ');
    navigator.clipboard.writeText(text);
    setCopiedMissingKeywords(true);
    setTimeout(() => setCopiedMissingKeywords(false), 2000);
    toast.success(`Copied ${missing.length} missing keywords to clipboard!`);
  };

  const getBadgeColor = (val: string) => {
    return val === 'Eligible' || val === 'Not Triggered'
      ? 'bg-pulse-green/10 text-emerald-400 border-emerald-500/20'
      : 'bg-coral-red/10 text-rose-400 border-rose-500/20';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'High Match', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    if (score >= 50) return { label: 'Moderate Match', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' };
    return { label: 'Low Match', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
  };

  const missingKeywordsList = extractAllMissingKeywords(typedResult?.keywordBreakdown);

  return (
    <div className="space-y-5 pb-20">
      
      {/* Gemini API & Model Setup */}
      <div className="border border-graphite rounded-2xl bg-carbon overflow-hidden">
        <button 
          onClick={() => setShowApiSettings(!showApiSettings)}
          className="w-full px-4 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ash border-b border-graphite/40 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-accent" />
            <span>AI Model & API Setup</span>
          </div>
          {showApiSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showApiSettings && (
          <div className="p-4 space-y-3 bg-void">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-ash">Select Gemini Model</label>
              <select
                value={selectedGeminiModel}
                onChange={(e) => setSelectedGeminiModel(e.target.value)}
                className="w-full px-3 py-2 bg-carbon border border-graphite rounded-xl text-xs text-white focus:outline-none focus:border-accent/40"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fastest & Latest)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="gemini-api-key" className="text-[9px] font-bold uppercase tracking-wider text-ash">Gemini API Key</label>
              <input 
                id="gemini-api-key"
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-4 py-2 bg-carbon border border-graphite rounded-xl text-xs text-mist placeholder:text-fog focus:outline-none focus:border-accent/40"
              />
            </div>
            <Button size="sm" onClick={handleSaveApiKey} className="w-full text-xs">
              Save Setup
            </Button>
          </div>
        )}
      </div>

      {/* Exclusion Rules Customizer */}
      <div className="border border-graphite rounded-2xl bg-carbon overflow-hidden">
        <button 
          onClick={() => setShowRuleSettings(!showRuleSettings)}
          className="w-full px-4 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-ash border-b border-graphite/40 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-accent" />
            <span>Configurable Exclusion Rules</span>
          </div>
          {showRuleSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showRuleSettings && (
          <div className="p-4 space-y-4 bg-void">
            {/* Global Companies */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ash block">Global Excluded Companies</span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-carbon rounded-xl border border-graphite">
                {globalExclusions.map((comp) => (
                  <span key={comp} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white">
                    {comp}
                    <button 
                      onClick={() => setGlobalExclusions(globalExclusions.filter(c => c !== comp))}
                      className="hover:text-red-400 ml-0.5 text-[9px]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add company name..."
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newCompany.trim()) {
                      e.preventDefault();
                      setGlobalExclusions([...globalExclusions, newCompany.trim()]);
                      setNewCompany('');
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-carbon border border-graphite rounded-lg text-xs text-white placeholder:text-fog focus:outline-none"
                />
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    if (newCompany.trim()) {
                      setGlobalExclusions([...globalExclusions, newCompany.trim()]);
                      setNewCompany('');
                    }
                  }}
                  className="text-[10px] px-3"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Global Sectors */}
            <div className="space-y-2 pt-2 border-t border-graphite/40">
              <span className="text-[9px] font-bold uppercase tracking-wider text-ash block">Excluded Sectors</span>
              <div className="flex flex-wrap gap-1.5 p-2 bg-carbon rounded-xl border border-graphite">
                {sectorExclusions.map((sector) => (
                  <span key={sector} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white">
                    {sector}
                    <button 
                      onClick={() => setSectorExclusions(sectorExclusions.filter(s => s !== sector))}
                      className="hover:text-red-400 ml-0.5 text-[9px]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input JD section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="jd-textarea" className="text-[10px] font-bold uppercase tracking-[0.2em] text-ash block">Target Job Description</label>
            <p className="text-[9px] text-fog">Highlight text on any tab and grab it below.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={grabSelectedText} icon={<ClipboardPaste className="w-3 h-3" />} className="text-[9px] py-1.5">
            Grab Selection
          </Button>
        </div>

        <textarea 
          id="jd-textarea"
          rows={5}
          placeholder="Paste Job Description here, or select/highlight text on a webpage and click 'Grab Selection' above..."
          value={checkerJdText}
          onChange={(e) => setCheckerJdText(e.target.value)}
          className="w-full px-4 py-3 bg-carbon border border-graphite rounded-xl text-xs text-white placeholder:text-fog focus:outline-none focus:border-accent/40 transition-all resize-none leading-relaxed"
        />

        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={analyzeEligibility} 
            isLoading={loading}
            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4 text-accent" />} 
            className="py-2.5 text-xs font-bold"
          >
            {loading ? 'Analyzing Match...' : 'Analyze Match & ATS'}
          </Button>

          <Button 
            variant="secondary"
            onClick={generateTailoredApplication} 
            isLoading={tailoringLoading}
            icon={tailoringLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />} 
            className="py-2.5 text-xs font-bold border-accent/30 hover:border-accent"
          >
            {tailoringLoading ? 'Tailoring...' : 'Tailor Bullets & Cover'}
          </Button>
        </div>
      </div>

      {/* Results Dashboard: ATS Score & Categorized Keyword Breakdown */}
      {typedResult && (
        <div className="space-y-4">
          
          {/* Main ATS Score Card */}
          <Card className="border-accent/25 bg-carbon p-4 space-y-4">
            
            {/* Top Score Row */}
            <div className="flex items-center justify-between border-b border-graphite pb-3">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-ash uppercase tracking-widest block">ATS Compatibility Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white">{typedResult.atsScore || 0}%</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getScoreBadge(typedResult.atsScore || 0).color}`}>
                    {getScoreBadge(typedResult.atsScore || 0).label}
                  </span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[9px] font-bold text-ash uppercase tracking-widest block">Exclusion Status</span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${getBadgeColor(typedResult.eligibility)}`}>
                  {typedResult.eligibility}
                </span>
              </div>
            </div>

            {/* Score Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-void rounded-full h-2 overflow-hidden border border-graphite/60">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    (typedResult.atsScore || 0) >= 80 
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' 
                      : (typedResult.atsScore || 0) >= 50 
                      ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' 
                      : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, typedResult.atsScore || 0))}%` }}
                />
              </div>
              {typedResult.matchSummary && (
                <p className="text-[11px] text-mist leading-relaxed italic bg-void p-2.5 rounded-lg border border-graphite/40">
                  "{typedResult.matchSummary}"
                </p>
              )}
            </div>

            {/* Quick Action: Copy Missing Keywords */}
            {missingKeywordsList.length > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <div className="flex items-center gap-2 text-[11px] text-rose-300 font-medium">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{missingKeywordsList.length} Missing JD Keywords Identified</span>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={handleCopyAllMissingKeywords}
                  icon={copiedMissingKeywords ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  className="text-[10px] py-1 px-2.5 h-auto border-rose-500/30 hover:border-rose-400"
                >
                  {copiedMissingKeywords ? 'Copied' : 'Copy All Missing'}
                </Button>
              </div>
            )}
          </Card>

          {/* Categorized Keyword & Skill Breakdown */}
          {typedResult.keywordBreakdown && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-ash flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-accent" />
                <span>Skill & Keyword Alignment Breakdown</span>
              </h3>

              <div className="space-y-3">
                
                {/* 1. Core Technical Skills */}
                <div className="bg-carbon border border-graphite rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                    <Wrench className="w-3.5 h-3.5 text-accent" />
                    <span>Core Technical Skills</span>
                  </div>
                  
                  {/* Matched */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Matched In Profile
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedResult.keywordBreakdown.coreSkills?.matched || []).length > 0 ? (
                        typedResult.keywordBreakdown.coreSkills.matched.map((skill, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-medium text-emerald-300">
                            ✓ {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-fog italic">No direct matches identified.</span>
                      )}
                    </div>
                  </div>

                  {/* Missing */}
                  <div className="space-y-1 pt-1.5 border-t border-graphite/40">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Missing From Profile
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedResult.keywordBreakdown.coreSkills?.missing || []).length > 0 ? (
                        typedResult.keywordBreakdown.coreSkills.missing.map((skill, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-[10px] font-medium text-rose-300">
                            ✕ {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400 italic">None! Full alignment on core skills.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Tools & Frameworks */}
                <div className="bg-carbon border border-graphite rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                    <Layers className="w-3.5 h-3.5 text-accent" />
                    <span>Tools, Frameworks & Cloud</span>
                  </div>

                  {/* Matched */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Matched In Profile
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedResult.keywordBreakdown.toolsAndFrameworks?.matched || []).length > 0 ? (
                        typedResult.keywordBreakdown.toolsAndFrameworks.matched.map((tool, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-medium text-emerald-300">
                            ✓ {tool}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-fog italic">No direct matches identified.</span>
                      )}
                    </div>
                  </div>

                  {/* Missing */}
                  <div className="space-y-1 pt-1.5 border-t border-graphite/40">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Missing From Profile
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedResult.keywordBreakdown.toolsAndFrameworks?.missing || []).length > 0 ? (
                        typedResult.keywordBreakdown.toolsAndFrameworks.missing.map((tool, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-[10px] font-medium text-rose-300">
                            ✕ {tool}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400 italic">None! All tools & frameworks present.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Domain Knowledge & Certifications */}
                <div className="bg-carbon border border-graphite rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-white text-xs font-bold">
                    <Award className="w-3.5 h-3.5 text-accent" />
                    <span>Domain Knowledge & Certifications</span>
                  </div>

                  {/* Matched */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Matched In Profile
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedResult.keywordBreakdown.domainAndCertifications?.matched || []).length > 0 ? (
                        typedResult.keywordBreakdown.domainAndCertifications.matched.map((domain, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-medium text-emerald-300">
                            ✓ {domain}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-fog italic">No domain certifications matched.</span>
                      )}
                    </div>
                  </div>

                  {/* Missing */}
                  <div className="space-y-1 pt-1.5 border-t border-graphite/40">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Missing From Profile
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(typedResult.keywordBreakdown.domainAndCertifications?.missing || []).length > 0 ? (
                        typedResult.keywordBreakdown.domainAndCertifications.missing.map((domain, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-[10px] font-medium text-rose-300">
                            ✕ {domain}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400 italic">None! All domain requirements satisfied.</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Reasoning Checklist */}
          <div className="bg-carbon border border-graphite rounded-xl p-3 space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-ash">Triggered Exclusion Checks</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-2 rounded border text-center text-[10px] font-bold ${getBadgeColor(typedResult.reasoning.company === 'Triggered' ? 'Not Eligible' : 'Eligible')}`}>
                <span className="block text-[8px] text-fog font-medium uppercase tracking-wider mb-0.5">Company</span>
                {typedResult.reasoning.company === 'Triggered' ? '❌ Triggered' : '✅ Clear'}
              </div>
              <div className={`p-2 rounded border text-center text-[10px] font-bold ${getBadgeColor(typedResult.reasoning.sector === 'Triggered' ? 'Not Eligible' : 'Eligible')}`}>
                <span className="block text-[8px] text-fog font-medium uppercase tracking-wider mb-0.5">Sector</span>
                {typedResult.reasoning.sector === 'Triggered' ? '❌ Triggered' : '✅ Clear'}
              </div>
              <div className={`p-2 rounded border text-center text-[10px] font-bold ${getBadgeColor(typedResult.reasoning.requirement === 'Triggered' ? 'Not Eligible' : 'Eligible')}`}>
                <span className="block text-[8px] text-fog font-medium uppercase tracking-wider mb-0.5">Requirement</span>
                {typedResult.reasoning.requirement === 'Triggered' ? '❌ Triggered' : '✅ Clear'}
              </div>
            </div>
            {typedResult.reasoning.notes && (
              <div className="bg-void border border-graphite p-2.5 rounded-lg mt-2">
                <span className="text-[8px] font-bold uppercase tracking-wider text-accent block mb-0.5">Exclusion Notes</span>
                <p className="text-[10px] text-mist leading-relaxed">{typedResult.reasoning.notes}</p>
              </div>
            )}
          </div>

          {/* Client-Specific status mappings */}
          {typedResult.userStatus && Object.keys(typedResult.userStatus).length > 0 && (
            <div className="bg-carbon border border-graphite rounded-xl p-3 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-ash">Client Specific Status</h4>
              <div className="space-y-1.5">
                {Object.keys(typedResult.userStatus).map((name) => {
                  const status = typedResult.userStatus[name];
                  return (
                    <div key={name} className="flex items-center justify-between p-2 bg-void border border-graphite rounded-lg">
                      <span className="text-xs font-bold text-white capitalize">{name}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getBadgeColor(status)}`}>
                        {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Tailored Bullets & Cover Letter Section */}
      {(tailoredBullets.length > 0 || tailoredCoverLetter) && (
        <Card className="border-accent/30 bg-carbon p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-graphite pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs font-black uppercase tracking-wider text-white">AI ATS Tailoring & Cover Letter</span>
            </div>
            <span className="text-[8px] bg-accent/15 text-accent font-bold px-2 py-0.5 rounded border border-accent/30 uppercase">
              Shortcut: cover;
            </span>
          </div>

          {/* Tailored Bullets */}
          {tailoredBullets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-ash">3 Targeted Resume Bullets</h4>
              <div className="space-y-2">
                {tailoredBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 bg-void border border-graphite rounded-lg group hover:border-accent/40 transition-colors">
                    <p className="text-[11px] text-mist flex-1 leading-relaxed">{bullet}</p>
                    <button
                      onClick={() => copyToClipboard(bullet, () => {
                        setCopiedBulletIdx(idx);
                        setTimeout(() => setCopiedBulletIdx(null), 2000);
                      })}
                      className="p-1 text-ash hover:text-accent shrink-0"
                      title="Copy bullet"
                    >
                      {copiedBulletIdx === idx ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tailored Cover Letter */}
          {tailoredCoverLetter && (
            <div className="space-y-2 pt-2 border-t border-graphite/60">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-ash">Tailored Cover Letter</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(tailoredCoverLetter, () => {
                    setCopiedCoverLetter(true);
                    setTimeout(() => setCopiedCoverLetter(false), 2000);
                  })}
                  icon={copiedCoverLetter ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  className="text-[9px] px-2 py-1"
                >
                  {copiedCoverLetter ? 'Copied' : 'Copy All'}
                </Button>
              </div>
              <div className="p-3 bg-void border border-graphite rounded-lg max-h-48 overflow-y-auto">
                <p className="text-[11px] text-mist leading-relaxed whitespace-pre-wrap">{tailoredCoverLetter}</p>
              </div>
            </div>
          )}
        </Card>
      )}

    </div>
  );
};
