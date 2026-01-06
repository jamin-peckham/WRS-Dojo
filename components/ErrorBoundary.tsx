
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "react-feather"; // Note: lucide-react was used in original, keeping original icons

import { AlertTriangle as AlertTriangleIcon, RefreshCw as RefreshCwIcon } from "lucide-react";

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Explicitly using Component from 'react' to ensure TypeScript correctly identifies 'state' and 'props' 
// properties from the base class.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fdf6e3] flex flex-col items-center justify-center p-8 text-center font-sans">
          <div className="bg-white p-8 rounded-xl shadow-2xl border-4 border-stone-800 max-w-md w-full">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-red-100 rounded-full text-red-600 border-2 border-red-200">
                <AlertTriangleIcon className="w-12 h-12" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-stone-900 uppercase tracking-widest mb-2 font-serif">
              Mission Interrupted
            </h1>
            <p className="text-stone-600 mb-6 font-medium">
              An unexpected error occurred in the application.
            </p>
            <div className="bg-stone-100 p-3 rounded text-left mb-6 overflow-auto max-h-32 text-xs font-mono text-stone-500 border border-stone-200">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-red-800 hover:bg-red-900 text-white py-3 rounded-lg font-bold uppercase tracking-widest transition-colors shadow-lg"
            >
              <RefreshCwIcon className="w-4 h-4" /> Reload Dojo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
