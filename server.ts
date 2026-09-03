import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Get OAuth Auth URL
  
  // AI proxy — tries each configured provider in order and returns real output.
  // Anthropic stays OFF until ANTHROPIC_ENABLED === "true" (toggle), so the chain
  // completely skips it until the toggle is on. No placeholder responses.
  app.post("/api/ai", async (req, res) => {
    try {
      const { system, user, maxTokens } = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;
      const groqKey = process.env.GROQ_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      const anthropicEnabled = process.env.ANTHROPIC_ENABLED === "true";
      const tokens = typeof maxTokens === "number" ? maxTokens : 1024;

      if (openaiKey) {
        const result = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            max_tokens: tokens,
          }),
        });
        const json = await result.json();
        return res.json({ provider: "openai", text: (json.choices?.[0]?.message?.content ?? "").trim() });
      }

      if (geminiKey) {
        const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens: tokens },
          }),
        });
        const json = await result.json();
        return res.json({ provider: "gemini", text: (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim() });
      }

      if (groqKey) {
        const result = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            max_tokens: tokens,
          }),
        });
        const json = await result.json();
        return res.json({ provider: "groq", text: (json.choices?.[0]?.message?.content ?? "").trim() });
      }

      // Anthropic is only reached when the toggle is explicitly enabled.
      if (anthropicEnabled && anthropicKey) {
        const result = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-latest",
            max_tokens: tokens,
            system,
            messages: [{ role: "user", content: user }],
          }),
        });
        const json = await result.json();
        return res.json({ provider: "anthropic", text: (json.content?.[0]?.text ?? "").trim() });
      }

      return res.status(503).json({ error: "No AI provider is configured on the server." });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/url", (req, res) => {
    const provider = req.query.provider as string;
    // We expect the client to pass the redirect_uri to us, or we construct it.
    // However, the proxy handles the host.
    const redirectUri = req.query.redirect_uri as string;

    // Check for real keys (e.g. STRIPE_CLIENT_ID)
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    
    if (clientId) {
      // Construct real provider URL (simplified for example)
      let providerAuthUrl = "";
      if (provider === "stripe") providerAuthUrl = "https://connect.stripe.com/oauth/authorize";
      else if (provider === "airbnb") providerAuthUrl = "https://www.airbnb.com/oauth2/auth";
      else providerAuthUrl = "https://example.com/oauth/authorize";

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
      });
      res.json({ url: `${providerAuthUrl}?${params.toString()}` });
    } else {
      // Fallback: DEMO Mock OAuth Provider
      const params = new URLSearchParams({
        client_id: 'demo_client',
        redirect_uri: redirectUri,
        provider: provider
      });
      res.json({ url: `/mock-oauth-provider?${params.toString()}` });
    }
  });

  // 2. The Callback (handles real and mock)
  app.get("/auth/callback", (req, res) => {
    const { code } = req.query;
    // In a real app, we would exchange the code for an access_token here
    // const tokens = await exchangeCodeForTokens(code);

    res.send(`
      <html>
        <head><title>Authentication Successful</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa;">
          <div style="text-align: center;">
            <svg style="width: 48px; height: 48px; color: #10B981; margin-bottom: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <h2 style="margin: 0 0 8px; color: #111;">Authentication Successful</h2>
            <p style="color: #666; font-size: 14px;">You can now close this window.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code: '${code}' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // 3. Mock OAuth Provider (to simulate 3rd party login when no API keys are provided)
  app.get("/mock-oauth-provider", (req, res) => {
    const { redirect_uri, provider } = req.query;
    res.send(`
      <html>
        <head><title>Authorize ${provider}</title></head>
        <body style="font-family: sans-serif; background: #f4f4f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <div style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%;">
            <div style="width: 64px; height: 64px; background: #eee; border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 24px; text-transform: uppercase; font-weight: bold;">
              ${(provider || "App").toString().substring(0,2)}
            </div>
            <h2 style="margin: 0 0 8px; color: #111;">Connect to ${provider}</h2>
            <p style="color: #52525b; font-size: 14px; margin-bottom: 24px;">
              DERZEN Demo is requesting access to your ${provider} account for read/write synchronization.
            </p>
            <button onclick="window.location.href = '${redirect_uri}?code=mock_code_12345'" style="background: #111; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">
              Authorize Access
            </button>
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 16px;">
              This is a sandbox mock provider because no ${String(provider).toUpperCase()}_CLIENT_ID was found in environment variables.
            </p>
          </div>
        </body>
      </html>
    `);
  });

  
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const httpServer = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Prevent Vite from reading --port from process.argv and binding its own WS server
    const originalArgv = process.argv;
    process.argv = process.argv.filter(a => !a.includes('--port') && !a.includes('--host'));

    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    process.argv = originalArgv;
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
       if (req.method === 'GET' && !req.path.startsWith('/api')) {
         res.sendFile(path.join(distPath, 'index.html'));
       } else {
         next();
       }
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

}

startServer().catch(err => {
  console.error(err);
  process.exit(1);
});
