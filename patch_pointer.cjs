const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

code = code.replace(
  /style=\{\{ pointerEvents: edit \? "none" : "auto" \}\}/g,
  ''
);

fs.writeFileSync('src/modules/Websites.tsx', code);
