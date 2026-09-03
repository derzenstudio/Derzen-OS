const fs = require('fs');
let code = fs.readFileSync('src/modules/DevBackoffice.tsx', 'utf8');

code = code.replace(
  `        </div>\n      </StaggerChildren></div></main>\n    </div>\n  );\n}`,
  `        </StaggerChildren>\n      </div>\n    </main>\n    </div>\n  );\n}`
);

fs.writeFileSync('src/modules/DevBackoffice.tsx', code);
