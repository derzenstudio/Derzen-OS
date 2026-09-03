const fs = require('fs');
let code = fs.readFileSync('src/lib/aiGateway.ts', 'utf8');

const oldMeta = `export const PROVIDER_META: Record<AiProviderId, { name: string; role: string; modelsUrl: string; keyHint: string; docs: string }> = {
  groq: {
    name: "Groq", role: "Primary",
    modelsUrl: "https://api.groq.com/openai/v1/models",
    keyHint: "gsk_…",
    docs: "console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter", role: "Fallback 1",
    modelsUrl: "https://openrouter.ai/api/v1/models",
    keyHint: "sk-or-v1-…",
    docs: "openrouter.ai/keys",
  },
  gemini: {
    name: "Google Gemini", role: "Fallback 2",
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",
    keyHint: "AIza…",
    docs: "aistudio.google.com/apikey",
  },
};`;

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
};`;

code = code.replace(oldMeta, newMeta);
fs.writeFileSync('src/lib/aiGateway.ts', code);
