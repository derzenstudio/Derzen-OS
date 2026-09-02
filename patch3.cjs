const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

const regex = /\{bulkMode && !p\.isParent \? \(\n\s*<input type="checkbox".*?\n\s*\) : \(\n\s*<span className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-line">\n\s*<img src=\{p\.image\}.*?\n\s*<\/span>\n\s*\)\}/s;

const replacement = `{bulkMode && !p.isParent && (
                        <input type="checkbox" aria-label={\`Select \${p.name}\`} checked={checked.includes(p.id)} onChange={() => setChecked((c) => c.includes(p.id) ? c.filter((x) => x !== p.id) : [...c, p.id])} className="accent-[#0E6B4E]" />
                      )}`;

if (!regex.test(code)) {
  console.log('Regex did not match');
  process.exit(1);
}

fs.writeFileSync('src/modules/Calendar.tsx', code.replace(regex, replacement));
console.log('Patched correctly');
