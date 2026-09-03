const fs = require('fs');
let code = fs.readFileSync('vite-plugin-ai.ts', 'utf8');

code = code.replace(
  /const response = await fetch\(/,
  `if (apiKey === "MY_GEMINI_API_KEY" || !apiKey) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ text: "Mocked AI Response due to placeholder key.", provider: "gemini", model: "gemini-3.6-flash", chain: ["server_proxy"] }));
    return;
  }
  const response = await fetch(`
);

fs.writeFileSync('vite-plugin-ai.ts', code);
