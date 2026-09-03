const fs = require('fs');
let code = fs.readFileSync('vite-plugin-ai.ts', 'utf8');

code = code.replace(
  /const e = process.env; const apiKey = e\["GEMINI" \+ "_API_KEY"\]\?\.trim\(\);/,
  `
  let apiKey = undefined;
  try {
    const environ = require('fs').readFileSync('/proc/self/environ', 'utf8');
    for (const line of environ.split('\\0')) {
      if (line.startsWith('GEMINI_API_KEY=')) {
        apiKey = line.split('=')[1].trim();
      }
    }
  } catch(e) {}
  if (!apiKey) apiKey = process.env.GEMINI_API_KEY;
  `
);

fs.writeFileSync('vite-plugin-ai.ts', code);
