const fs = require('fs');
let code = fs.readFileSync('src/modules/Reservations.tsx', 'utf8');

if (!code.includes('import { Reveal, StaggerGroup }')) {
  code = code.replace(
    'import { ChannelMark } from "../components/ota";',
    'import { ChannelMark } from "../components/ota";\nimport { Reveal } from "../components/animations";'
  );
}

// Wrap top bar
code = code.replace(
  '<div className="mb-4 flex flex-wrap items-center gap-3">',
  '<Reveal direction="down" distance={10}><div className="mb-4 flex flex-wrap items-center gap-3">'
);
code = code.replace(
  '${list.length} rows\`); }}>Export</Btn>\n      </div>',
  '${list.length} rows\`); }}>Export</Btn>\n      </div></Reveal>'
);

// Wrap table container
code = code.replace(
  '<div className="overflow-x-auto rounded-xl border border-line bg-card">',
  '<Reveal direction="up" distance={20} delay={100}><div className="overflow-x-auto rounded-xl border border-line bg-card">'
);
code = code.replace(
  '        </table>\n      </div>\n    </div>\n  );\n}',
  '        </table>\n      </div></Reveal>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Reservations.tsx', code);
