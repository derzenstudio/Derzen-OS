const fs = require('fs');
let code = fs.readFileSync('src/modules/DevPlatform.tsx', 'utf8');

code = code.replace(
  /\{\/\*[\s\S]*?\*\/\}/g,
  ''
);

code = code.replace(
  /\*\/\}<\/Panel>/g,
  '</Panel>'
);

fs.writeFileSync('src/modules/DevPlatform.tsx', code);
