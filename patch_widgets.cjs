const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

// Update SearchWidgetPreview
code = code.replace(
  /function SearchWidgetPreview\(\{ st \}: \{ st: ReturnType<typeof useApp\.getState>\["widgetStyle"\] \}\) \{/,
  'function SearchWidgetPreview({ st, onSearch }: { st: ReturnType<typeof useApp.getState>["widgetStyle"]; onSearch?: () => void }) {'
);
code = code.replace(
  /<button style=\{\{ \.\.\.btnCls, borderRadius: st\.btnRadius, padding: "8px 18px", fontWeight: 700, fontSize: "0\.95em", cursor: "pointer" \}\}>Search villas<\/button>/,
  '<button onClick={onSearch} style={{ ...btnCls, borderRadius: st.btnRadius, padding: "8px 18px", fontWeight: 700, fontSize: "0.95em", cursor: "pointer" }}>Search villas</button>'
);

// Update CalendarWidgetPreview
code = code.replace(
  /function CalendarWidgetPreview\(\{ st, propId \}: \{ st: ReturnType<typeof useApp\.getState>\["widgetStyle"\]; propId: string \}\) \{/,
  'function CalendarWidgetPreview({ st, propId, onBooked }: { st: ReturnType<typeof useApp.getState>["widgetStyle"]; propId: string; onBooked?: () => void }) {'
);
code = code.replace(
  /<button style=\{\{ \.\.\.btnCls, borderRadius: st\.btnRadius, padding: "8px 18px", fontWeight: 700, cursor: "pointer" \}\}>Book now →<\/button>/,
  '<button onClick={onBooked} style={{ ...btnCls, borderRadius: st.btnRadius, padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}>Book now →</button>'
);

fs.writeFileSync('src/modules/Websites.tsx', code);
