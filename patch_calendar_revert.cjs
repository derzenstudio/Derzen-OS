const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

code = code.replace(
  'const pushCurrentBlock = () => {\n    if (!currentBlock) return;\n    const dayUse = currentBlock.checkIn === currentBlock.checkOut;\n    let left, width, clipPath, textLeft, textRight;\n    const rawLeft = idxOf(currentBlock.checkIn, windowStart) * COL_W;\n    const rawRight = idxOf(currentBlock.checkOut, windowStart) * COL_W;\n    \n    if (dayUse) {\n      left = rawLeft + 4; width = COL_W - 8; clipPath = "none"; textLeft = 0; textRight = 0;\n    } else {\n      left = rawLeft; width = rawRight - rawLeft;\n      clipPath = "none";\n      textLeft = Math.max(0, -left) + 12;\n      textRight = Math.max(0, (left + width) - (nights * COL_W)) + 12;\n    }',
  'const pushCurrentBlock = () => {\n    if (!currentBlock) return;\n    const dayUse = currentBlock.checkIn === currentBlock.checkOut;\n    let left, width, clipPath, textLeft, textRight;\n    const rawLeft = idxOf(currentBlock.checkIn, windowStart) * COL_W;\n    const rawRight = idxOf(currentBlock.checkOut, windowStart) * COL_W + COL_W;\n    \n    if (dayUse) {\n      left = rawLeft + 4; width = COL_W - 8; clipPath = "none"; textLeft = 0; textRight = 0;\n    } else {\n      left = rawLeft; width = rawRight - rawLeft;\n      clipPath = `polygon(0 0, calc(100% - ${COL_W}px) 0, 100% 100%, ${COL_W}px 100%)`;\n      textLeft = Math.max(0, -left) + 60;\n      textRight = Math.max(0, (left + width) - (nights * COL_W)) + 60;\n    }'
);

fs.writeFileSync('src/modules/Calendar.tsx', code);
