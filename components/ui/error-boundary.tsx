'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in ${this.props.name || 'Component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center text-center space-y-3 min-h-[200px] w-full">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
             <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive">Failed to load content</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto line-clamp-3">
              {this.state.error?.message || "An unexpected error occurred while rendering this module."}
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
            }}
            className="px-4 py-2 mt-4 text-sm font-medium bg-background border shadow-sm rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
