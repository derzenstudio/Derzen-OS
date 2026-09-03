const http = require('http');
const req = http.request('http://localhost:3000/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => console.log(body));
});
req.write(JSON.stringify({ system: "Say OK", user: "Say OK" }));
req.end();
