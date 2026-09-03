const fs = require('fs');
let code = fs.readFileSync('src/modules/Dashboard.tsx', 'utf8');

code = code.replace(
  '        </section>\n      </div>\n\n      {/* Tasks & reminders */}',
  '        </section>\n      </StaggerGroup>\n\n      {/* Tasks & reminders */}'
);

fs.writeFileSync('src/modules/Dashboard.tsx', code);
