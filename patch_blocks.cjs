const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

code = code.replace(
  /\{ type: "search_bar", label: "Search bar", icon: "search" \},/,
  '{ type: "search_bar", label: "Search bar", icon: "search" },\n    { type: "booking_calendar", label: "Listing calendar", icon: "calendar" },\n    { type: "group_calendar", label: "Group calendar", icon: "calendar" },'
);

// We need to implement the actual BlockView cases for these.
// search_bar currently just renders a mock field and button.
// Let's replace the `search_bar` case, and add `booking_calendar` and `group_calendar`.

const newBlocks = `      case "search_bar": {
        const theme = { btn: "solid", accent: es("button")?.background || "#111", card: es("field")?.background || "#fff", text: "#111", borderW: 1, borderColor: "#e5e7eb", radius: s.radius, btnRadius: s.radius, pad: "16px", gap: "12px", sub: "#6b7280" } as any;
        return (
          <div className="relative z-10" style={{ pointerEvents: edit ? "none" : "auto" }}>
            <SearchWidgetPreview st={theme} />
          </div>
        );
      }
      case "booking_calendar": {
        const theme = { btn: "solid", accent: es("button")?.background || "#111", card: es("field")?.background || "#fff", text: "#111", borderW: 1, borderColor: "#e5e7eb", radius: s.radius, btnRadius: s.radius, pad: "16px", gap: "12px", sub: "#6b7280" } as any;
        return (
          <div className="relative z-10" style={{ pointerEvents: edit ? "none" : "auto" }}>
            <CalendarWidgetPreview st={theme} propId={PROPERTIES[0].id} />
          </div>
        );
      }
      case "group_calendar": {
        const theme = { btn: "solid", accent: es("button")?.background || "#111", card: es("field")?.background || "#fff", text: "#111", borderW: 1, borderColor: "#e5e7eb", radius: s.radius, btnRadius: s.radius, pad: "16px", gap: "12px", sub: "#6b7280" } as any;
        // Reusing the CalendarWidgetPreview but tweaking for a group visual
        return (
          <div className="relative z-10" style={{ pointerEvents: edit ? "none" : "auto" }}>
            <div className="mb-4">
              <h3 className="font-display text-[16px] font-bold text-ink mb-1">Samudra Estate (Group)</h3>
              <p className="text-[12px] text-mute mb-3">Book the entire estate (3 villas) or select individually.</p>
              <div className="flex gap-2">
                <Btn size="xs" variant="solid">Entire Estate</Btn>
                <Btn size="xs" variant="outline">Villa One</Btn>
                <Btn size="xs" variant="outline">Villa Two</Btn>
                <Btn size="xs" variant="outline">Villa Three</Btn>
              </div>
            </div>
            <CalendarWidgetPreview st={theme} propId={PROPERTIES[0].id} />
          </div>
        );
      }`;

code = code.replace(
  /case "search_bar": return \([\s\S]*?\);\n      case "collection_grid":/,
  newBlocks + '\n      case "collection_grid":'
);

fs.writeFileSync('src/modules/Websites.tsx', code);
