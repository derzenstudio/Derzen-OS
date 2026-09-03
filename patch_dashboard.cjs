const fs = require('fs');
let code = fs.readFileSync('src/modules/Dashboard.tsx', 'utf8');

if (!code.includes('import { Reveal, StaggerGroup }')) {
  code = code.replace(
    'import { guestById, propertyById, channelDef } from "../lib/data";',
    'import { guestById, propertyById, channelDef } from "../lib/data";\nimport { Reveal, StaggerGroup } from "../components/animations";'
  );
}

// Wrap "Shift sheet" in a Reveal
code = code.replace(
  '<div className="reg-marks relative overflow-hidden border border-line bg-card px-5 py-5">',
  '<Reveal direction="up" distance={20}><div className="reg-marks relative overflow-hidden border border-line bg-card px-5 py-5">'
);
code = code.replace(
  '          </div>\n        </div>\n      </div>',
  '          </div>\n        </div>\n      </div></Reveal>'
);

// Wrap Pulse board in Reveal
code = code.replace(
  '{/* The Pulse — 7-day business telemetry */}\n      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">',
  '{/* The Pulse — 7-day business telemetry */}\n      <Reveal direction="up" distance={30} delay={100}><div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">'
);
code = code.replace(
  '        <Stat label="Net Reviews" value={newReviews} to="/reviews" suffix="added in 7d" tone="var(--color-brand)" spark={[6, 8, 4, 12, 10, 15, 20]} />\n      </div>',
  '        <Stat label="Net Reviews" value={newReviews} to="/reviews" suffix="added in 7d" tone="var(--color-brand)" spark={[6, 8, 4, 12, 10, 15, 20]} />\n      </div></Reveal>'
);

// Wrap the 3 columns (Check-ins, Queue, Operations) in StaggerGroup
code = code.replace(
  '<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">',
  '<StaggerGroup stagger={100} className="grid grid-cols-1 gap-6 lg:grid-cols-3">'
);
code = code.replace(
  '          </div>\n        </section>\n      </div>\n    </div>\n  );\n}',
  '          </div>\n        </section>\n      </StaggerGroup>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Dashboard.tsx', code);
