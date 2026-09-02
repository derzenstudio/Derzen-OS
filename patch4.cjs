const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

code = code.replace(/<input type="checkbox" aria-label=\{`Select \$\{p\.name\}`\}.*?\/>/s, '<input type="checkbox" aria-label={`Select ${p.name}`} checked={bulkChecked.includes(p.id)} onChange={() => setBulkChecked((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id])} className="accent-[#0E6B4E]" />');

fs.writeFileSync('src/modules/Calendar.tsx', code);
