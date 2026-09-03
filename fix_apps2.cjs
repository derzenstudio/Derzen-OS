const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
  '              </div>\n            ))}\n          </div>\n        </div>\n      ))}',
  `              </div>\n            )})}\n          </div>\n        </div>\n      ))}`
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
