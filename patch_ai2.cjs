const fs = require('fs');
let code = fs.readFileSync('src/lib/aiGateway.ts', 'utf8');

// Replace AiProviderId and AiProviderState
code = code.replace(
  'export type AiProviderId = "groq" | "openrouter" | "gemini";\n\nexport interface ProviderConfig {',
  'export type AiProviderId = "openai" | "groq" | "gemini" | "anthropic";\n\nexport interface ProviderConfig {'
);

code = code.replace(
  'export interface AiProviderState {\n  groq: ProviderConfig;\n  openrouter: ProviderConfig;\n  gemini: ProviderConfig;\n}',
  'export interface AiProviderState {\n  openai: ProviderConfig;\n  groq: ProviderConfig;\n  gemini: ProviderConfig;\n  anthropic: ProviderConfig;\n}'
);

code = code.replace(
  'const CHAIN: { id: AiProviderId; role: string }[] = [\n  { id: "groq", role: "Primary" },\n  { id: "openrouter", role: "Fallback 1" },\n  { id: "gemini", role: "Fallback 2" },\n];',
  'const CHAIN: { id: AiProviderId; role: string }[] = [\n  { id: "openai", role: "Primary" },\n  { id: "gemini", role: "Fallback 1" },\n  { id: "groq", role: "Fallback 2" },\n  { id: "anthropic", role: "Fallback 3 (Disabled by default)" },\n];'
);

// We need to overwrite PROVIDER_META completely. Let's do it by regex.
const metaRegex = /export const PROVIDER_META[\s\S]*?\n};\n\nconst DEFAULT_PROVIDERS/m;
const newMeta = `export const PROVIDER_META: Record<AiProviderId, { name: string; role: string; modelsUrl: string; keyHint: string; docs: string }> = {
  openai: {
    name: "OpenAI", role: "Primary",
    modelsUrl: "https://api.openai.com/v1/models",
    keyHint: "sk-...",
    docs: "platform.openai.com/api-keys",
  },
  gemini: {
    name: "Gemini", role: "Fallback 1",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    keyHint: "AIza...",
    docs: "aistudio.google.com/app/apikey",
  },
  groq: {
    name: "Groq", role: "Fallback 2",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    keyHint: "gsk_...",
    docs: "console.groq.com/keys",
  },
  anthropic: {
    name: "Anthropic", role: "Fallback 3",
    modelsUrl: "https://api.anthropic.com/v1/models",
    keyHint: "sk-ant-...",
    docs: "console.anthropic.com/settings/keys",
  },
};

const DEFAULT_PROVIDERS`;
code = code.replace(metaRegex, newMeta);

// We need to rewrite DEFAULT_PROVIDERS
const defaultRegex = /const DEFAULT_PROVIDERS: AiProviderState = [\s\S]*?\n};\n\n/m;
const newDefault = `const DEFAULT_PROVIDERS: AiProviderState = {
  openai: { apiKey: "", model: "gpt-4o-mini", enabled: true },
  gemini: { apiKey: "", model: "gemini-1.5-flash", enabled: true },
  groq: { apiKey: "", model: "llama3-8b-8192", enabled: true },
  anthropic: { apiKey: "", model: "claude-3-haiku-20240307", enabled: false },
};

`;
code = code.replace(defaultRegex, newDefault);

// Add chatOpenAI and chatAnthropic, replace chatOpenRouter
code = code.replace(
  'async function chatOpenRouter(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {',
  'async function chatOpenAI(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {\n  const res = await fetch("https://api.openai.com/v1/chat/completions", {\n    method: "POST",\n    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },\n    body: JSON.stringify({\n      model: cfg.model,\n      messages: [{ role: "system", content: system }, { role: "user", content: user }],\n      max_tokens: maxTokens,\n      temperature: 0.4,\n    }),\n  });\n  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);\n  const json = await res.json() as any;\n  return json.choices?.[0]?.message?.content?.trim() || "";\n}\n\nasync function chatAnthropic(cfg: ProviderConfig, system: string, user: string, maxTokens: number): Promise<string> {\n  const res = await fetch("https://api.anthropic.com/v1/messages", {\n    method: "POST",\n    headers: {\n      "Content-Type": "application/json",\n      "x-api-key": cfg.apiKey,\n      "anthropic-version": "2023-06-01",\n      "anthropic-dangerously-allow-browser": "true",\n    },\n    body: JSON.stringify({\n      model: cfg.model,\n      system,\n      messages: [{ role: "user", content: user }],\n      max_tokens: maxTokens,\n      temperature: 0.4,\n    }),\n  });\n  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);\n  const json = await res.json() as any;\n  return json.content?.[0]?.text?.trim() || "";\n}\n\nasync function _ignore('
);
code = code.replace('async function _ignore(', 'async function _ignore('); // Just a marker

// Now fix the CHAT record
const chatRegex = /const CHAT: Record<AiProviderId,[\s\S]*?\n};\n/m;
const newChat = `const CHAT: Record<AiProviderId, (cfg: ProviderConfig, s: string, u: string, m: number) => Promise<string>> = {
  openai: chatOpenAI,
  groq: chatGroq,
  gemini: chatGemini,
  anthropic: chatAnthropic,
};
`;
code = code.replace(chatRegex, newChat);

// Fix loadProviders
code = code.replace('openrouter: { ...DEFAULT_PROVIDERS.openrouter, ...p.openrouter },', 'openai: { ...DEFAULT_PROVIDERS.openai, ...p.openai },\n      anthropic: { ...DEFAULT_PROVIDERS.anthropic, ...p.anthropic },');

fs.writeFileSync('src/lib/aiGateway.ts', code);
