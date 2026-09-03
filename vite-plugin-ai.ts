import type { Plugin } from 'vite';
import * as fs from 'node:fs';
import * as path from 'node:path';

export function aiProxyPlugin(): Plugin {
  return {
    name: 'ai-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/ai' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { system, user, maxTokens } = JSON.parse(body);

              let apiKey = undefined;
              try {
                const envPath = path.join(process.cwd(), '.env.local');
                if (fs.existsSync(envPath)) {
                  const envLocal = fs.readFileSync(envPath, 'utf8');
                  for (const line of envLocal.split('\n')) {
                    if (line.startsWith('GEMINI_API_KEY=')) {
                      apiKey = line.split('=')[1].trim();
                    }
                  }
                }
              } catch(e) {
                console.error("Error reading .env.local:", e);
              }
              
              if (!apiKey) apiKey = process.env.GEMINI_API_KEY;

              if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: "No valid Gemini API key available on local server", debug: apiKey }));
                return;
              }

              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system || "You are a helpful assistant." }] },
                    contents: [{ parts: [{ text: user || "Hello" }] }],
                    generationConfig: { maxOutputTokens: maxTokens || 600, temperature: 0.4 },
                  }),
                }
              );

              if (!response.ok) {
                const text = await response.text();
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Gemini HTTP ${response.status}: ${text}` }));
                return;
              }

              const json = await response.json();
              const text = (json.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("").trim();
              
              if (!text) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: "Gemini returned empty completion" }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ text, provider: "gemini", model: "gemini-3.6-flash", chain: ["server_proxy"] }));
            } catch (e: any) {
              console.error("Server AI proxy error:", e);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}
