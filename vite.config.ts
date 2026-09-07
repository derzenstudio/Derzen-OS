import { defineConfig } from "vite";

// There was no config file before this one, so it deliberately changes none
// of the defaults: the root, the entry document and the base path all stay
// exactly as Vite infers them. The only thing it adds is chunk splitting.
//
// Why it was needed. app.alvianpermana.art served every asset in /assets
// except one: the entry chunk answered 503 on two different content hashes
// while its siblings in the same directory returned 200, and the FTP step
// for this surface had already timed out on the control socket more than
// once. One very large file was the only property those two builds shared.
// Cutting the dependencies out of the entry keeps every file small enough to
// finish uploading and small enough for the host to serve.
export default defineConfig({
  build: {
    // Never ship source maps: they hand the reader the original source.
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Only third-party code is moved. Nothing under src/ is regrouped,
        // because these modules mutate each other in place on sign-in and
        // reordering their evaluation would be a real risk for no gain.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
});
