const fs = require('fs');
let code = fs.readFileSync('src/modules/DevPlatform.tsx', 'utf8');

// The file has `{/*` without a closing `*/}`.
// Let's just find any `{/*` and if it doesn't have a `*/}`, append it before `</Panel>`.
code = code.replace(/\{\/\*[\s\S]*?<\/Panel>/g, '</Panel>');

fs.writeFileSync('src/modules/DevPlatform.tsx', code);
