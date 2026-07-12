import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui';
import { AlertTriangle, Download, Database, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface WipeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmWipeOnly: () => Promise<void>;
  onExportMergeUniversal: (file: File, onDownload: (url: string, filename: string) => void) => Promise<void>;
  onExportCSV: (onDownload: (url: string, filename: string) => void) => Promise<void>;
}

export const WipeConfirmationModal = ({
  isOpen,
  onClose,
  onConfirmWipeOnly,
  onExportMergeUniversal,
  onExportCSV
}: WipeConfirmationModalProps) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerChromeDownload = (fileUrl: string, filename: string, onWipe: () => Promise<void>) => {
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      chrome.downloads.download({
        url: fileUrl,
        filename: filename,
        saveAs: true // Show "Save As" file picker first
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          toast.error('Download Failed', { description: chrome.runtime.lastError.message });
          setLoading(false);
          URL.revokeObjectURL(fileUrl);
          return;
        }

        // Monitor download status changes
        const listener = (delta: chrome.downloads.DownloadDelta) => {
          if (delta.id === downloadId) {
            if (delta.state) {
              if (delta.state.current === 'complete') {
                chrome.downloads.onChanged.removeListener(listener);
                URL.revokeObjectURL(fileUrl);
                
                // Now that file is safely saved on disk, wipe the database
                onWipe().then(() => {
                  setLoading(false);
                  onClose();
                }).catch(() => {
                  setLoading(false);
                });
              } else if (delta.state.current === 'interrupted') {
                chrome.downloads.onChanged.removeListener(listener);
                URL.revokeObjectURL(fileUrl);
                toast.error('Download Cancelled or Failed', { 
                  description: 'The local database was NOT wiped to prevent data loss.' 
                });
                setLoading(false);
              }
            }
          }
        };
        chrome.downloads.onChanged.addListener(listener);
      });
    } else {
      // Fallback download trigger if running outside extension context
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', fileUrl);
      downloadLink.setAttribute('download', filename);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clear database after delay
      setTimeout(() => {
        URL.revokeObjectURL(fileUrl);
        onWipe().then(() => {
          setLoading(false);
          onClose();
        }).catch(() => {
          setLoading(false);
        });
      }, 2000);
    }
  };

  const handleExportCSVAndWipe = async () => {
    setLoading(true);
    try {
      await onExportCSV((url, name) => {
        triggerChromeDownload(url, name, onConfirmWipeOnly);
      });
    } catch (err) {
      setLoading(false);
    }
  };

  const handleMergeAndWipe = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      await onExportMergeUniversal(file, (url, name) => {
        triggerChromeDownload(url, name, onConfirmWipeOnly);
      });
    } catch (err) {
      setLoading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wipe Local Database"
    >
      <div className="space-y-5 text-center">
        <input
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          onChange={handleMergeAndWipe}
          className="hidden"
        />

        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
          <AlertTriangle className="w-6 h-6 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white leading-snug">
            Save applications before wiping?
          </h3>
          <p className="text-xs text-slate-400 px-2 leading-relaxed">
            This will permanently clear all applications from your local database to start a fresh day. To prevent data loss, please select a backup option below:
          </p>
        </div>

        <div className="space-y-2 max-w-sm mx-auto pt-2">
          {/* Option 1: Merge to existing Vault file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full flex items-center justify-between px-4 py-3 bg-carbon border border-graphite hover:border-bone rounded-xl text-left transition-colors group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-[10px] font-bold text-paper uppercase tracking-wider">Export & Merge to Vault</div>
                <div className="text-[9px] text-ash">Select your local XLSX file to merge and update</div>
              </div>
            </div>
          </button>

          {/* Option 2: Export directly to new file */}
          <button
            onClick={handleExportCSVAndWipe}
            disabled={loading}
            className="w-full flex items-center justify-between px-4 py-3 bg-carbon border border-graphite hover:border-bone rounded-xl text-left transition-colors group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-[10px] font-bold text-paper uppercase tracking-wider">Download Standalone Excel</div>
                <div className="text-[9px] text-ash">Download directly to your downloads folder</div>
              </div>
            </div>
          </button>

          {/* Option 3: Wipe directly without saving */}
          <button
            onClick={async () => {
              setLoading(true);
              await onConfirmWipeOnly();
              setLoading(false);
              onClose();
            }}
            disabled={loading}
            className="w-full flex items-center justify-between px-4 py-3 bg-red-950/10 border border-red-500/20 hover:border-red-500/50 rounded-xl text-left transition-colors group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
              <div>
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Wipe Only (No Save)</div>
                <div className="text-[9px] text-red-500/60">Permanently delete local database without backing up</div>
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="text-[10px] w-28 py-2 hover:bg-white/5"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
