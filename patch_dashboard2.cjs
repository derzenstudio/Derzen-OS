const fs = require('fs');
let code = fs.readFileSync('src/modules/Dashboard.tsx', 'utf8');

// The first wrap "Shift sheet" is already applied, but missing closing tag? Wait, I closed it after the shift sheet.
// Let's remove any Reveal/StaggerGroup first to make it clean.
code = code.replace(/<Reveal[^>]*>/g, '').replace(/<\/Reveal>/g, '');
code = code.replace(/<StaggerGroup[^>]*>/g, '').replace(/<\/StaggerGroup>/g, '');

// Re-apply Reveal properly
code = code.replace(
  '<div className="reg-marks relative overflow-hidden border border-line bg-card px-5 py-5">',
  '<Reveal direction="up" distance={20}><div className="reg-marks relative overflow-hidden border border-line bg-card px-5 py-5">'
);
code = code.replace(
  '        <div className="dbl-rule relative mt-4" aria-hidden="true" />\n      </div>',
  '        <div className="dbl-rule relative mt-4" aria-hidden="true" />\n      </div></Reveal>'
);

// Stat widgets
code = code.replace(
  '      {/* Stat widgets — every number deep-links */}\n      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">',
  '      {/* Stat widgets — every number deep-links */}\n      <Reveal direction="up" distance={30} delay={100}><div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">'
);
code = code.replace(
  '        <Stat label={t("dash.bookings7")} value={newRes} to="/reservations?focus=new" tone="#1485A8" spark={[0.3, 0.2, 0.5, 0.4, 0.6, 0.8, 0.7]} />\n      </div>',
  '        <Stat label={t("dash.bookings7")} value={newRes} to="/reservations?focus=new" tone="#1485A8" spark={[0.3, 0.2, 0.5, 0.4, 0.6, 0.8, 0.7]} />\n      </div></Reveal>'
);

// The 3 columns grid
code = code.replace(
  '      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">',
  '      <StaggerGroup stagger={100} direction="up" distance={20} className="grid grid-cols-1 gap-4 xl:grid-cols-3">'
);
code = code.replace(
  '      </section>\n    </div>\n  );\n}',
  '      </section>\n    </StaggerGroup>\n  );\n}'
);

fs.writeFileSync('src/modules/Dashboard.tsx', code);
