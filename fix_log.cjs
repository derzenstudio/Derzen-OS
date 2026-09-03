const fs = require('fs');
let code = fs.readFileSync('vite-plugin-ai.ts', 'utf8');
code = code.replace(
  /console\.log\("VITE PLUGIN FETCH URL:".*/,
  'console.log("API KEY IN VITE:", apiKey ? `${apiKey.substring(0, 4)}... (len ${apiKey.length})` : "undefined"); const response = await fetch('
);
fs.writeFileSync('vite-plugin-ai.ts', code);
