import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || '';
      let title = 'Something went wrong';
      let description = 'An error occurred while loading this section.';

      if (errorMessage.includes('permission-denied')) {
        title = 'Access Denied';
        description = 'You do not have permission to access the requested data. Please ensure you are logged in correctly.';
      } else if (errorMessage.includes('unavailable') || errorMessage.includes('network')) {
        title = 'Connection Issue';
        description = 'Unable to connect to the database. Please check your internet connection and try again.';
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-theme-text mb-2">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            {description}
          </p>
          <div className="glass-panel p-3 rounded-lg border border-theme-border mb-6 max-w-lg w-full overflow-hidden text-left">
            <p className="text-xs font-mono text-red-500 whitespace-pre-wrap break-words">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-cyan-400 border border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] rounded-lg font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
