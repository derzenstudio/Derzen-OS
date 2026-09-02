const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

// For reservations
code = code.replace(
  /textLeft = Math\.max\(0, -left\);\s*textRight = Math\.max\(0, \(left \+ width\) - \(nights \* COL_W\)\);/,
  'textLeft = Math.max(0, -left) + 24;\n      textRight = Math.max(0, (left + width) - (nights * COL_W)) + 24;'
);

// For manual overrides
code = code.replace(
  /textLeft = Math\.max\(0, -left\);\s*textRight = Math\.max\(0, \(left \+ width\) - \(nights \* COL_W\)\);/,
  'textLeft = Math.max(0, -left) + 24;\n      textRight = Math.max(0, (left + width) - (nights * COL_W)) + 24;'
);

fs.writeFileSync('src/modules/Calendar.tsx', code);
