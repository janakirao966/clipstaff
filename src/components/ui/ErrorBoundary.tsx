import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-5 min-h-[400px] flex flex-col justify-center bg-void border border-graphite rounded-3xl space-y-5 animate-in fade-in duration-300 font-sans">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-paper">
                Something went wrong
              </h3>
              <p className="text-[10px] text-ash max-w-[240px]">
                An unexpected rendering error occurred. The application state has been paused to prevent data loss.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-carbon/50 border border-graphite rounded-2xl space-y-2 max-h-[140px] overflow-y-auto">
            <div className="flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-widest text-red-400">
              <AlertCircle className="w-3 h-3" />
              <span>Error Details</span>
            </div>
            <p className="text-[9px] font-mono text-mist break-all leading-normal">
              {this.state.error?.toString() || 'Unknown Error'}
            </p>
            {this.state.errorInfo && (
              <pre className="text-[8px] font-mono text-ash leading-relaxed whitespace-pre-wrap mt-1 border-t border-graphite/40 pt-1">
                {this.state.errorInfo?.componentStack?.split('\n').slice(0, 4).join('\n')}
              </pre>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 py-2 bg-accent hover:bg-accent-hover text-void text-[10px] font-black uppercase tracking-wider rounded-xl transition-all font-sans"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Extension</span>
            </button>
            
            <a
              href="https://github.com/janakirao966/clipstaff/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center text-[9px] font-bold text-ash hover:text-mist hover:underline uppercase tracking-wider py-1.5"
            >
              Report this incident
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
