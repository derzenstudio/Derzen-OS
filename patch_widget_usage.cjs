const fs = require('fs');
let code = fs.readFileSync('src/modules/Websites.tsx', 'utf8');

code = code.replace(
  /<SearchWidgetPreview st=\{theme\} \/>/,
  '<SearchWidgetPreview st={theme} onSearch={() => { if (!edit) useApp.getState().navigate("/pay"); else useApp.getState().toast("ok", "Search button clicked", "This will redirect guests to your booking engine."); }} />'
);

code = code.replace(
  /<CalendarWidgetPreview st=\{theme\} propId=\{propId\} \/>/,
  '<CalendarWidgetPreview st={theme} propId={propId} onBooked={() => { if (!edit) useApp.getState().navigate("/pay/" + propId); else useApp.getState().toast("ok", "Book button clicked", "This will redirect guests to the checkout for " + propId); }} />'
);

// We have two CalendarWidgetPreviews (one in booking_calendar, one in group_calendar). Let's do it globally.
code = code.replace(
  /<CalendarWidgetPreview st=\{theme\} propId=\{PROPERTIES\[0\]\.id\} \/>/g,
  '<CalendarWidgetPreview st={theme} propId={c.propertyId || PROPERTIES[0].id} onBooked={() => { if (!edit) useApp.getState().navigate("/pay/" + (c.propertyId || PROPERTIES[0].id)); else useApp.getState().toast("ok", "Book button clicked", "Redirects to checkout."); }} />'
);

fs.writeFileSync('src/modules/Websites.tsx', code);
