const http = require('http');
http.get('http://localhost:3000/api/ai', (res) => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => console.log(body));
});
