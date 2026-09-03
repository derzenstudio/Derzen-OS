const fs = require('fs');
let code = fs.readFileSync('src/modules/Inbox.tsx', 'utf8');

if (!code.includes('import { Reveal, StaggerGroup }')) {
  code = code.replace(
    'import { ChannelMark } from "../components/ota";',
    'import { ChannelMark } from "../components/ota";\nimport { Reveal, StaggerGroup } from "../components/animations";'
  );
}

// Wrap top bar
code = code.replace(
  '<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-line bg-card px-3.5 py-2">',
  '<Reveal direction="down" distance={10}><div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-line bg-card px-3.5 py-2">'
);
code = code.replace(
  'manage connections\n        </button>\n      </div>',
  'manage connections\n        </button>\n      </div></Reveal>'
);


// Thread list
code = code.replace(
  '<div className="flex-1 overflow-y-auto">',
  '<div className="flex-1 overflow-y-auto">\n          <StaggerGroup stagger={50} direction="up" distance={15}>'
);

code = code.replace(
  '              </button>\n            );\n          })}\n        </div>',
  '              </button>\n            );\n          })}\n          </StaggerGroup>\n        </div>'
);

// Right side 
code = code.replace(
  '<section className="flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-sm" aria-label="Active thread">',
  '<Reveal direction="left" distance={20} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-line bg-card shadow-sm"><section className="flex h-full flex-col" aria-label="Active thread">'
);
code = code.replace(
  '</section>\n      </div>\n    </div>\n  );\n}',
  '</section></Reveal>\n      </div>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Inbox.tsx', code);
