const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/const DevBackoffice = lazy\(\(\) => import\("\.\/modules\/DevBackoffice"\)\);\n/, '');
code = code.replace(/ : sub === "backoffice" \? <DevBackoffice \/>\n/g, '');

fs.writeFileSync('src/App.tsx', code);
