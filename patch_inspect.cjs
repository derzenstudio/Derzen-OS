const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

code = code.replace(
  /f\.kind === "icons" \? \(\s*<Ifield key=\{f\.key\} label=\{f\.label\} hint="Tap the circle to swap an icon · labels edit in place">\s*<IconRowsEditor value=\{c\[f\.key\] \?\? ""\} onChange=\{\(v\) => onContent\(\{ \[f\.key\]: v \}\)\} \/>\s*<\/Ifield>\s*\) : \(/,
  `f.kind === "icons" ? (
              <Ifield key={f.key} label={f.label} hint="Tap the circle to swap an icon · labels edit in place">
                <IconRowsEditor value={c[f.key] ?? ""} onChange={(v) => onContent({ [f.key]: v })} />
              </Ifield>
            ) : f.kind === "select_property" ? (
              <Ifield key={f.key} label={f.label}>
                <Select value={c[f.key] ?? ""} onChange={(e) => onContent({ [f.key]: e.target.value })}>
                  <option value="">Select property...</option>
                  {PROPERTIES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Ifield>
            ) : (`
);

fs.writeFileSync('src/modules/Websites.tsx', code);
