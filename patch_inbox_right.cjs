const fs = require('fs');
let code = fs.readFileSync('src/modules/Inbox.tsx', 'utf8');

// The thread view is the section with aria-label="Conversation"
code = code.replace(
  '<section className="flex min-w-0 flex-1 flex-col rounded-xl border border-line bg-card" aria-label="Conversation">',
  '<Reveal direction="left" distance={20} className="flex min-w-0 flex-1 flex-col rounded-xl border border-line bg-card shadow-sm"><section className="flex h-full flex-col" aria-label="Conversation">'
);
code = code.replace(
  '</footer>\n          </>\n        )}\n      </section>',
  '</footer>\n          </>\n        )}\n      </section></Reveal>'
);

// The Context rail is aside aria-label="Guest context"
code = code.replace(
  '<aside className="hidden w-[264px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex" aria-label="Guest context">',
  '<Reveal direction="left" distance={30} delay={100} className="hidden w-[264px] shrink-0 flex-col gap-3 overflow-y-auto xl:flex"><aside className="flex flex-col gap-3 h-full" aria-label="Guest context">'
);

code = code.replace(
  '            </div>\n        )}\n      </aside>\n    </div>\n  );\n}',
  '            </div>\n        )}\n      </aside></Reveal>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Inbox.tsx', code);
