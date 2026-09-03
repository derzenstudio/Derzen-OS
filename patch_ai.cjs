const fs = require('fs');
let code = fs.readFileSync('src/lib/aiGateway.ts', 'utf8');

code = code.replace(
  'export type AiProviderId = "groq" | "openrouter" | "gemini";',
  'export type AiProviderId = "openai" | "groq" | "gemini" | "anthropic";'
);
code = code.replace(
  '  openrouter: ProviderConfig;',
  '  openai: ProviderConfig;\n  anthropic: ProviderConfig;'
);
code = code.replace(
  'const CHAIN: { id: AiProviderId; role: string }[] = [\n  { id: "groq", role: "Primary" },\n  { id: "openrouter", role: "Fallback 1" },\n  { id: "gemini", role: "Fallback 2" },\n];',
  'export const CHAIN: { id: AiProviderId; role: string }[] = [\n  { id: "openai", role: "Primary" },\n  { id: "gemini", role: "Fallback 1" },\n  { id: "groq", role: "Fallback 2" },\n  { id: "anthropic", role: "Fallback 3 (Disabled by default)" },\n];'
);
fs.writeFileSync('src/lib/aiGateway.ts', code);
