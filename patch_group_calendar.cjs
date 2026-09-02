const fs = require('fs');
let code = fs.readFileSync('src/lib/blockContent.ts', 'utf8');

code = code.replace(
  /group_calendar: \[\],/,
  'group_calendar: [{ key: "title", label: "Group Title" }, { key: "subtitle", label: "Group Subtitle" }, { key: "propertyId", label: "Selected Property ID", kind: "select_property" }],'
);

code = code.replace(
  /booking_calendar: \[\],/,
  'booking_calendar: [{ key: "propertyId", label: "Selected Property ID", kind: "select_property" }],'
);

code = code.replace(
  /case "booking_calendar": return \{\};/,
  'case "booking_calendar": return { propertyId: "" };'
);
code = code.replace(
  /case "group_calendar": return \{\};/,
  'case "group_calendar": return { title: "Samudra Estate (Group)", subtitle: "Book the entire estate or select individually.", propertyId: "" };'
);

fs.writeFileSync('src/lib/blockContent.ts', code);
