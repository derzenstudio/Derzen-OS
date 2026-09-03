const fs = require('fs');
let code = fs.readFileSync('src/modules/Dashboard.tsx', 'utf8');

code = code.replace(
  '      </section>\n    </div>\n  );\n}',
  '      </section>\n    </StaggerGroup>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Dashboard.tsx', code);
