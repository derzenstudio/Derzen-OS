const fs = require('fs');
let code = fs.readFileSync('src/modules/Inbox.tsx', 'utf8');
code = code.replace(
  '      </aside>\n      </div>\n    </div>\n  );\n}',
  '      </aside></Reveal>\n      </div>\n    </div>\n  );\n}'
);
fs.writeFileSync('src/modules/Inbox.tsx', code);
