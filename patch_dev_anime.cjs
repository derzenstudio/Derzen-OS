const fs = require('fs');
let code = fs.readFileSync('src/modules/DevBackoffice.tsx', 'utf8');

code = code.replace(
  `import { TENANTS } from "../lib/tenants";`,
  `import { TENANTS } from "../lib/tenants";\nimport { StaggerChildren, AnimateMount } from "../components/AnimateMount";`
);

code = code.replace(
  `<div className="space-y-4 p-6">`,
  `<div className="space-y-4 p-6"><StaggerChildren>`
);

code = code.replace(
  `</main>\n    </div>`,
  `</StaggerChildren></div></main>\n    </div>`
);

fs.writeFileSync('src/modules/DevBackoffice.tsx', code);
