const fs = require('fs');
let code = fs.readFileSync('src/modules/Public.tsx', 'utf8');

code = code.replace(
  '<aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">',
  '<Reveal direction="right" distance={50} delay={100} className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex h-full w-full">'
);
code = code.replace(
  '      </aside>\n\n      {/* Form — customer sign-in / sign-up (developer entry only on dev.* host) */}',
  '      </Reveal>\n\n      {/* Form — customer sign-in / sign-up (developer entry only on dev.* host) */}'
);
code = code.replace(
  '<div className="w-full max-w-[430px] anim-rise">',
  '<Reveal direction="up" distance={40} delay={300}>\n        <div className="w-full max-w-[430px]">'
);
code = code.replace(
  '          {err && <div className="mt-4 rounded-md border border-danger/40 bg-danger-soft p-3 text-[12px] leading-snug text-danger">{err}</div>}',
  '          {err && <Reveal direction="down" distance={10}><div className="mt-4 rounded-md border border-danger/40 bg-danger-soft p-3 text-[12px] leading-snug text-danger">{err}</div></Reveal>}'
);
code = code.replace(
  '        </div>\n      </main>\n    </div>',
  '        </div>\n        </Reveal>\n      </main>\n    </div>'
);

fs.writeFileSync('src/modules/Public.tsx', code);
