const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');
code = code.replace(/<Ic name="refreshCw"/g, '<Ic name="refresh"');
fs.writeFileSync('src/modules/Calendar.tsx', code);
