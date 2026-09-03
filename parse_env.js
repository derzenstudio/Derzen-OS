const fs = require('fs');
let apiKey = undefined;
const envLocal = fs.readFileSync('.env.local', 'utf8');
for (const line of envLocal.split('\n')) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
}
console.log("Parsed API Key:", apiKey);
