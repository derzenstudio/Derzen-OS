const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

code = code.replace(
  '<Btn icon="download" onClick={exportCSV}>CSV</Btn>',
  '{tab === "properties" && (\n            <button\n              onClick={() => {\n                toast("ok", "Sync started", "Pulling latest reservations from Airbnb, Booking.com, Expedia, and Agoda...");\n                setTimeout(() => toast("ok", "Sync complete", "Calendar is fully in sync with all connected OTAs."), 2500);\n              }}\n              className="flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-[12px] font-bold text-mute transition-all hover:text-ink hover:border-brand/40"\n            >\n              <Ic name="refreshCw" size={13} /> Sync OTAs\n            </button>\n          )}\n          <Btn icon="download" onClick={exportCSV}>CSV</Btn>'
);

fs.writeFileSync('src/modules/Calendar.tsx', code);
