const fs = require('fs');
let code = fs.readFileSync('supabase/functions/ai-proxy/index.ts', 'utf8');

// Replace Provider type
code = code.replace(
  `type Provider = "groq" | "openrouter" | "gemini";`,
  `type Provider = "anthropic" | "groq" | "openrouter" | "gemini";`
);

// Replace CHAIN array
const newChain = `const CHAIN: { id: Provider; env: string; model: string }[] = [
  { id: "anthropic", env: "ANTHROPIC_API_KEY", model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-3-5-haiku-20241022" },
  { id: "groq", env: "GROQ_API_KEY", model: Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile" },
  { id: "openrouter", env: "OPENROUTER_API_KEY", model: Deno.env.get("OPENROUTER_MODEL") ?? "anthropic/claude-3.5-haiku" },
  { id: "gemini", env: "GEMINI_API_KEY", model: Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash" },
];`;

code = code.replace(/const CHAIN:.*?];/s, newChain);

// Modify callProvider to support anthropic
const anthropicCall = `  if (p === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        system,
        messages: [{ role: "user", content: user }],
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) throw new Error(\`anthropic \${res.status}\`);
    const j = await res.json();
    const text = j.content?.[0]?.text?.trim();
    if (!text) throw new Error("anthropic empty");
    return text;
  }
`;

code = code.replace(
  `async function callProvider(p: Provider, key: string, model: string, system: string, user: string, maxTokens: number): Promise<string> {\n  if (p === "gemini") {`,
  `async function callProvider(p: Provider, key: string, model: string, system: string, user: string, maxTokens: number): Promise<string> {\n${anthropicCall}  if (p === "gemini") {`
);

// Add PLACEHOLDER check in loop
code = code.replace(
  `const key = Deno.env.get(env);\n    if (!key) {`,
  `const key = Deno.env.get(env);\n    if (!key || key.startsWith("PLACEHOLDER")) {`
);

// Accept provider selection from body if given
code = code.replace(
  `let body: { system?: string; user?: string; maxTokens?: number };`,
  `let body: { system?: string; user?: string; maxTokens?: number; provider?: string; model?: string };`
);

code = code.replace(
  `for (const { id, env, model } of CHAIN) {`,
  `for (const { id, env, model: defaultModel } of CHAIN) {
    if (body.provider && body.provider !== id) continue;
    const model = body.provider === id && body.model ? body.model : defaultModel;`
);

fs.writeFileSync('supabase/functions/ai-proxy/index.ts', code);
