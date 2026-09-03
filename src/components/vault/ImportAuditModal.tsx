import React, { useState } from 'react';
import { 
  ImportAuditReport, 
  ImportStrategy 
} from '../../types';
import { Modal } from '../ui/Modal';
import { Button, Card } from '../ui';
import { 
  User, 
  Zap, 
  Briefcase, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface ImportAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ImportAuditReport | null;
  fileName?: string;
  onConfirm: (strategy: ImportStrategy) => Promise<void>;
}

export const ImportAuditModal: React.FC<ImportAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  fileName,
  onConfirm
}) => {
  const [strategy, setStrategy] = useState<ImportStrategy>('merge');
  const [executing, setExecuting] = useState(false);

  if (!isOpen || !report) return null;

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await onConfirm(strategy);
      onClose();
    } catch (e) {
      console.error('Import confirmation error:', e);
    } finally {
      setExecuting(false);
    }
  };

  const getFormatBadge = () => {
    switch (report.format) {
      case 'clipstaff_profile_bundle':
        return { label: 'Complete Profile Bundle (v2.0)', color: 'text-accent border-accent/30 bg-accent/10', icon: User };
      case 'clipstaff_system_backup':
        return { label: 'Full System Backup (Multi-Profile)', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: Layers };
      case 'legacy_profile_json':
        return { label: 'Profile Backup (Legacy JSON)', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: FileText };
      case 'snippets_array':
      case 'shortcuts_map':
        return { label: 'Vault Shortcuts File', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: Zap };
      case 'jobs_array':
        return { label: 'Job Applications File', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: Briefcase };
      default:
        return { label: 'Generic JSON Data', color: 'text-ash border-graphite bg-carbon', icon: FileText };
    }
  };

  const badge = getFormatBadge();
  const BadgeIcon = badge.icon;

  const totalItemsToImport = 
    (report.profileData ? 1 : 0) + 
    report.snippetsToImport.total + 
    report.applicationsToImport.total;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit & Import Profile Data"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-mist max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
        {/* File Format Banner */}
        <div className="flex items-center justify-between p-3 bg-void border border-graphite rounded-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-lg border shrink-0 ${badge.color}`}>
              <BadgeIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.color}`}>
                  {badge.label}
                </span>
                {report.version && (
                  <span className="text-[9px] text-ash font-mono">v{report.version}</span>
                )}
              </div>
              <p className="text-[11px] text-white font-medium truncate mt-0.5">
                {fileName || 'Imported File.json'}
              </p>
            </div>
          </div>
          {report.exportedAt && (
            <div className="text-right text-[9px] text-ash shrink-0">
              <p>Exported:</p>
              <p className="text-mist font-mono">{new Date(report.exportedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Profile Card Preview (If present) */}
        {report.profileData && (
          <Card className="bg-carbon border-graphite p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  {report.profileName || 'Target Profile'}
                </span>
              </div>
              <span className="text-[9px] font-semibold text-accent px-2 py-0.5 bg-accent/10 border border-accent/20 rounded">
                {report.profileFieldCount} fields populated
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-void/50 p-2.5 rounded-lg border border-graphite/60">
              {report.profileData.email && (
                <div className="truncate">
                  <span className="text-[9px] text-ash uppercase font-semibold block">Email:</span>
                  <span className="text-mist">{report.profileData.email}</span>
                </div>
              )}
              {report.profileData.phone && (
                <div className="truncate">
                  <span className="text-[9px] text-ash uppercase font-semibold block">Phone:</span>
                  <span className="text-mist">{report.profileData.phone}</span>
                </div>
              )}
              {report.profileData.location && (
                <div className="truncate col-span-2">
                  <span className="text-[9px] text-ash uppercase font-semibold block">Location:</span>
                  <span className="text-mist">{report.profileData.location}</span>
                </div>
              )}
              {report.profileData.professional_subtitle && (
                <div className="truncate col-span-2">
                  <span className="text-[9px] text-ash uppercase font-semibold block">Title / Subtitle:</span>
                  <span className="text-mist">{report.profileData.professional_subtitle}</span>
                </div>
              )}
            </div>

            {/* Experience & Education counts */}
            <div className="flex items-center gap-3 text-[10px] text-ash pt-1 border-t border-graphite/40">
              <span>💼 {report.profileData.experience?.length || 0} Experience(s)</span>
              <span>🎓 {report.profileData.education?.length || 0} Education(s)</span>
              <span>📜 {report.profileData.certifications?.length || 0} Certification(s)</span>
              {report.resumeText && <span className="text-pulse-green">✓ Raw Resume</span>}
            </div>
          </Card>
        )}

        {/* Metrics Bento Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Shortcuts Tile */}
          <div className="p-3 bg-carbon border border-graphite rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ash flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-accent" /> Shortcuts
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {report.snippetsToImport.total}
              </span>
            </div>
            {report.snippetsToImport.total > 0 ? (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-pulse-green font-medium">+{report.snippetsToImport.newCount} new</span>
                <span className="text-ash">•</span>
                <span className="text-amber-400 font-medium">~{report.snippetsToImport.updateCount} update</span>
              </div>
            ) : (
              <p className="text-[10px] text-ash">No manual shortcuts in file</p>
            )}
          </div>

          {/* Applications Tile */}
          <div className="p-3 bg-carbon border border-graphite rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ash flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-accent" /> Applications
              </span>
              <span className="text-xs font-bold text-white font-mono">
                {report.applicationsToImport.total}
              </span>
            </div>
            {report.applicationsToImport.total > 0 ? (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-pulse-green font-medium">+{report.applicationsToImport.newCount} new</span>
                <span className="text-ash">•</span>
                <span className="text-blue-400 font-medium">↑{report.applicationsToImport.upgradeCount} upgrades</span>
              </div>
            ) : (
              <p className="text-[10px] text-ash">No tracked jobs in file</p>
            )}
          </div>
        </div>

        {/* Warnings Alert (If present) */}
        {report.warnings.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[10px]">
              <p className="font-bold uppercase tracking-wider text-amber-300">Auditor Notice</p>
              {report.warnings.map((w, idx) => (
                <p key={idx} className="text-amber-200/90 leading-relaxed">• {w}</p>
              ))}
            </div>
          </div>
        )}

        {/* Import Strategy Selector */}
        <div className="space-y-2 pt-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-ash ml-1">
            Choose Import Strategy
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Merge Option */}
            <div 
              onClick={() => setStrategy('merge')}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                strategy === 'merge'
                  ? 'bg-accent/10 border-accent/50 text-white ring-1 ring-accent/30'
                  : 'bg-carbon border-graphite hover:border-smoke text-ash hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-accent-light">
                  Merge & Sync
                </span>
                {strategy === 'merge' && <CheckCircle2 className="w-4 h-4 text-accent" />}
              </div>
              <p className="text-[10px] text-ash leading-snug">
                Recommended. Preserves existing items and non-conflicting entries, updating matching data cleanly.
              </p>
            </div>

            {/* Overwrite Option */}
            <div 
              onClick={() => setStrategy('overwrite')}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                strategy === 'overwrite'
                  ? 'bg-coral-red/10 border-coral-red/50 text-white ring-1 ring-coral-red/30'
                  : 'bg-carbon border-graphite hover:border-smoke text-ash hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-coral-red">
                  Fresh Overwrite
                </span>
                {strategy === 'overwrite' && <ShieldAlert className="w-4 h-4 text-coral-red" />}
              </div>
              <p className="text-[10px] text-ash leading-snug">
                Replaces current active profile and cleans out conflicting records with this backup.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-graphite">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={executing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExecute}
            disabled={executing}
            icon={executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          >
            {executing ? 'Importing...' : `Confirm Import (${totalItemsToImport} items)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
