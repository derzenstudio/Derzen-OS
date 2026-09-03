const fs = require('fs');
let code = fs.readFileSync('src/modules/DevConsole.tsx', 'utf8');

code = code.replace(/groq: false, openrouter: false, gemini: false/g, 'openai: false, groq: false, gemini: false, anthropic: false');
code = code.replace(/groq: \[\], openrouter: \[\], gemini: \[\]/g, 'openai: [], groq: [], gemini: [], anthropic: []');
code = code.replace(
  'const PROVIDER_ORDER: AiProviderId[] = ["groq", "openrouter", "gemini"];',
  'const PROVIDER_ORDER: AiProviderId[] = ["openai", "gemini", "groq", "anthropic"];'
);
code = code.replace(
  '<h2 className="mt-0.5 font-display text-[20px] font-extrabold uppercase tracking-tight text-white">Groq → OpenRouter → Gemini</h2>',
  '<h2 className="mt-0.5 font-display text-[20px] font-extrabold uppercase tracking-tight text-white">OpenAI → Gemini → Groq → Anthropic</h2>'
);

fs.writeFileSync('src/modules/DevConsole.tsx', code);
