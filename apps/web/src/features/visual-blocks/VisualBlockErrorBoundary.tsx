import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class VisualBlockErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[VisualBlockErrorBoundary] Caught render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <div className="text-red-400 text-lg">⚠</div>
          <p className="text-sm text-red-300 font-medium">
            {this.props.fallbackMessage || "Unable to render this block."}
          </p>
          <p className="text-xs text-slate-500">
            The rest of the app is unaffected.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
