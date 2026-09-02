const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

code = code.replace(
  /<h3 className="font-display text-\[16px\] font-bold text-ink mb-1">\{c\.title \|\| "Samudra Estate \(Group\)"\}<\/h3>/,
  '<h3 className="font-display text-[16px] font-bold text-ink mb-1">{edit ? <EditableText as="span" value={c.title || ""} onCommit={(v) => { if (onContent) onContent({ title: v }); }} placeholder="Group Title" /> : c.title || "Samudra Estate (Group)"}</h3>'
);

code = code.replace(
  /<p className="text-\[12px\] text-mute mb-3">\{c\.subtitle \|\| "Book the entire estate \(3 villas\) or select individually\."\}<\/p>/,
  '<p className="text-[12px] text-mute mb-3">{edit ? <EditableText as="span" value={c.subtitle || ""} onCommit={(v) => { if (onContent) onContent({ subtitle: v }); }} placeholder="Group Subtitle" /> : c.subtitle || "Book the entire estate (3 villas) or select individually."}</p>'
);

fs.writeFileSync('src/modules/Websites.tsx', code);
