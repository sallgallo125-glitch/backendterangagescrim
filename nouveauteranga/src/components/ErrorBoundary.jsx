import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
        <div className="w-16 h-16 bg-[#FEF2F2] rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[#DC2626]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] dark:text-white mb-1">
            Une erreur inattendue s'est produite
          </h2>
          <p className="text-sm text-[#64748B] dark:text-white/50 max-w-sm">
            {this.state.error?.message || 'Erreur interne — veuillez réessayer ou contacter le support.'}
          </p>
        </div>
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] hover:bg-[#143728] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Recharger la page
        </button>
      </div>
    );
  }
}
