const fs = require('fs');
let code = fs.readFileSync('src/lib/blockContent.ts', 'utf8');

// Add to CONTENT_SCHEMA
code = code.replace(
  /search_bar: \[\{ key: "button", label: "Button label" \}, \{ key: "placeholder", label: "Placeholder" \}\],/,
  'search_bar: [{ key: "button", label: "Button label" }, { key: "placeholder", label: "Placeholder" }],\n  booking_calendar: [],\n  group_calendar: [],'
);

// Add to defaultBlockContent
code = code.replace(
  /case "search_bar": return \{ button: "Search stays", placeholder: "Dates · guests · area" \};/,
  'case "search_bar": return { button: "Search stays", placeholder: "Dates · guests · area" };\n    case "booking_calendar": return {};\n    case "group_calendar": return {};'
);

// Add to ELEMENTS
code = code.replace(
  /search_bar: \[\{ id: "field", label: "Search field", kind: "container" \}, \{ id: "button", label: "Button", kind: "button" \}\],/,
  'search_bar: [{ id: "field", label: "Search field", kind: "container" }, { id: "button", label: "Button", kind: "button" }],\n  booking_calendar: [{ id: "field", label: "Calendar wrap", kind: "container" }, { id: "button", label: "Book Button", kind: "button" }],\n  group_calendar: [{ id: "field", label: "Group wrap", kind: "container" }, { id: "button", label: "Book Button", kind: "button" }],'
);

fs.writeFileSync('src/lib/blockContent.ts', code);
