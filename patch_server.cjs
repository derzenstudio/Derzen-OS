const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const aiRoute = `
  // AI proxy
  app.post("/api/ai", async (req, res) => {
    try {
      const { system, user, maxTokens } = req.body;
      const openaiKey = process.env.OPENAI_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;
      const groqKey = process.env.GROQ_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;

      if (openaiKey) {
        const result = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: \`Bearer \${openaiKey}\` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: system }, { role: "user", content: user }],
            max_tokens: maxTokens,
          }),
        });
        const json = await result.json();
        return res.json({ text: json.choices?.[0]?.message?.content?.trim() || "" });
      }

      if (geminiKey) {
        const result = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${geminiKey}\`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        });
        const json = await result.json();
        return res.json({ text: (json.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? "").join("").trim() });
      }
      
      throw new Error("No backend API keys configured for fallback");
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
`;

code = code.replace('app.get("/api/auth/url", (req, res) => {', aiRoute + '\n  app.get("/api/auth/url", (req, res) => {');

fs.writeFileSync('server.ts', code);
