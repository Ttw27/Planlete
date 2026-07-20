import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white font-body flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <p className="text-overline text-[#D4FF00] mb-4">— Error</p>
            <h1 className="font-display text-4xl md:text-5xl uppercase leading-none tracking-tight mb-6">
              Something went wrong
            </h1>
            <p className="text-zinc-400 text-sm mb-8">
              We've encountered an unexpected error. Try refreshing the page, or{" "}
              <a href="/" className="text-[#D4FF00] hover:underline">
                return to home
              </a>
              .
            </p>
            {process.env.NODE_ENV === "development" && (
              <details className="text-left text-xs text-zinc-600 border border-zinc-800 p-3 rounded bg-zinc-950">
                <summary className="cursor-pointer text-zinc-400 mb-2">Error details</summary>
                <pre className="overflow-auto text-left text-[10px] whitespace-pre-wrap break-words">
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-block mt-8 bg-[#D4FF00] text-black font-bold uppercase tracking-wider text-xs px-6 py-3 hover:bg-white transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
