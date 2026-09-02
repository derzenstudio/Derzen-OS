const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

code = code.replace(
  /textLeft = Math\.max\(0, -left\) \+ 24;/g,
  'textLeft = Math.max(0, -left) + 60;'
);

code = code.replace(
  /textRight = Math\.max\(0, \(left \+ width\) - \(nights \* COL_W\)\) \+ 24;/g,
  'textRight = Math.max(0, (left + width) - (nights * COL_W)) + 60;'
);

// Fix month sticky header
// Before: <div key={i} className="flex items-center border-r border-line px-2 font-display text-[11px] font-bold text-ink" style={{ width: m.span * COL_W }}>{m.label}</div>
// We need to use position: sticky for the month label inside this container so it stays visible while scrolling horizontally.
// But wait, the container itself scrolls. The month label is in a flex container that spans m.span * COL_W.
// If we make the label sticky inside its container, it works natively in CSS.

code = code.replace(
  /<div key=\{i\} className="flex items-center border-r border-line px-2 font-display text-\[11px\] font-bold text-ink" style=\{\{ width: m\.span \* COL_W \}\}>\{m\.label\}<\/div>/,
  '<div key={i} className="border-r border-line" style={{ width: m.span * COL_W }}><div className="sticky left-[224px] inline-flex h-full items-center px-2 font-display text-[11px] font-bold text-ink">{m.label}</div></div>'
);

fs.writeFileSync('src/modules/Calendar.tsx', code);
