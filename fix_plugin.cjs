const fs = require('fs');
let code = fs.readFileSync('vite-plugin-ai.ts', 'utf8');

code = code.replace(
  'if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {',
  'if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {\n  res.statusCode = 500;\n  res.end(JSON.stringify({ error: "No valid Gemini API key available on local server", cwd: process.cwd(), apiKey: apiKey }));\n  return;\n}'
);

fs.writeFileSync('vite-plugin-ai.ts', code);
