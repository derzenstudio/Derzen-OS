const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

code = code.replace(/const rawRight = idxOf\(r\.checkOut, windowStart\) \* COL_W \+ COL_W;/g, 'const rawRight = idxOf(r.checkOut, windowStart) * COL_W;');
code = code.replace(/const rawRight = idxOf\(currentBlock\.checkOut, windowStart\) \* COL_W \+ COL_W;/g, 'const rawRight = idxOf(currentBlock.checkOut, windowStart) * COL_W;');
code = code.replace(/const rawRight = idxOf\(b\.checkOut, windowStart\) \* COL_W \+ COL_W;/g, 'const rawRight = idxOf(b.checkOut, windowStart) * COL_W;');

fs.writeFileSync('src/modules/Calendar.tsx', code);
