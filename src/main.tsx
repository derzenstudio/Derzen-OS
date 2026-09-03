import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Every deploy renames each hashed chunk. A browser still holding a cached
// index.html asks for chunk names the server no longer has, the dynamic import
// rejects, Suspense unmounts the route, and the surface renders blank with
// controls that appear dead. The .htaccess shipped by CI stops new visitors
// from getting into that state; this recovers the ones already in it. Reload
// once and only once - a sessionStorage latch means a genuine network outage
// degrades to the error boundary instead of a reload loop.
const RELOAD_LATCH = "derzen.chunkReload";
window.addEventListener("vite:preloadError", (event) => {
  if (sessionStorage.getItem(RELOAD_LATCH)) return;
  event.preventDefault();
  sessionStorage.setItem(RELOAD_LATCH, String(Date.now()));
  window.location.reload();
});

// A clean boot means the cached-chunk problem is behind us; drop the latch so
// a future deploy can heal itself the same way.
window.addEventListener("load", () => sessionStorage.removeItem(RELOAD_LATCH));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
