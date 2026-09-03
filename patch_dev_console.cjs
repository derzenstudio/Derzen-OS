const fs = require('fs');
let code = fs.readFileSync('src/modules/DevConsole.tsx', 'utf8');

code = code.replace(
  '<p className="mt-3 rounded-md border border-[#5a4a20] bg-[#241f10] px-3 py-2 text-[11.5px] leading-relaxed text-[#E6C868]">\n          This registry lives in this browser, so it is per-device and anyone who reaches the dev host before you can\n          claim the first owner seat. It keeps a shared password out of the shipped bundle. It is not authentication.\n          Move the check server-side before this console holds anything that matters.\n        </p>',
  ''
);

fs.writeFileSync('src/modules/DevConsole.tsx', code);
