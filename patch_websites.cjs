const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

// 1. Update setLibOpen to capture pointer
code = code.replace(
  /onClick=\{\(\) => setLibOpen\(true\)\}/g,
  'onClick={(e) => { setPtr({ x: e.clientX, y: e.clientY }); setLibOpen(true); }}'
);

// 2. Change libOpen Modal to FloatPanel
const libModalRegex = /<Modal open=\{libOpen\} onClose=\{\(\) => setLibOpen\(false\)\} title="Block library" w=\{580\}\n\s*footer=\{<Btn variant="ghost" onClick=\{\(\) => setLibOpen\(false\)\}>Close<\/Btn>\}>\n\s*(<div className="space-y-4">[\s\S]*?<\/div>)\n\s*<\/Modal>/;
code = code.replace(libModalRegex, (match, content) => {
  return `{libOpen && (
        <FloatPanel anchor="lib" title="Block library" at={ptr} onClose={() => setLibOpen(false)}>
          ${content}
        </FloatPanel>
      )}`;
});

fs.writeFileSync('src/modules/Websites.tsx', code);
