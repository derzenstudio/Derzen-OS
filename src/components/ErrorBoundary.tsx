import { Component, type ErrorInfo, type ReactNode } from "react";

// A single render throw anywhere in the tree used to unmount the whole app and
// leave a blank page with no route back. This catches it, keeps the session
// intact, and gives the operator a way out that is not "close the tab".

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Replace with the real sink (Sentry, or the platform incident feed) once
    // one exists. Console is the only sink in this build.
    console.error("[derzen] render error", error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
    window.location.hash = "#/en/dashboard";
  };

  private hardReset = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("derzen.tenant."))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* private mode */ }
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#f4f5f0", color: "#141811", padding: 24,
          fontFamily: "'Atkinson Hyperlegible', system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 560, border: "1px solid #d5d7cd", background: "#fff", padding: 28, borderRadius: 2 }}>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0E6B4E", margin: 0 }}>
            Something broke
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0 10px" }}>This screen failed to render</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "0 0 16px", color: "#4a4f45" }}>
            Your session is still signed in and nothing was lost. Go back to the dashboard, or clear the saved
            workspace for this browser if the same screen keeps failing.
          </p>
          <pre style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, background: "#f4f5f0",
            border: "1px solid #e2e4da", padding: 10, overflowX: "auto", margin: "0 0 18px", borderRadius: 2,
          }}>{error.message}</pre>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={this.reset} style={btn("#141811", "#fff")}>Back to dashboard</button>
            <button onClick={this.hardReset} style={btn("transparent", "#141811", "1px solid #141811")}>
              Clear saved workspace
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const btn = (bg: string, fg: string, border = "1px solid transparent") => ({
  background: bg, color: fg, border, borderRadius: 2, padding: "9px 16px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});
