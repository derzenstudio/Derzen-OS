const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf8');
code = code.replace(/,\s*\.\.\.\(newGuest \? \{ guests: \[\.\.\.st\.guests, newGuest\] \} : \{\}\)/g, '');
fs.writeFileSync('src/store.ts', code);
