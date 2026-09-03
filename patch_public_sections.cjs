const fs = require('fs');
let code = fs.readFileSync('src/modules/Public.tsx', 'utf8');

code = code.replace(
  '<section id="product" className="border-t border-line bg-paper/60 py-20">',
  '<section id="product" className="border-t border-line bg-paper/60 py-20">\n        <Reveal direction="up" distance={40}>'
);
code = code.replace(
  '        <div className="mx-auto max-w-[1160px] px-5">\n          <header className="mb-10">\n            <h2 className="font-display text-[26px] font-bold">Capabilities, strictly scoped.</h2>\n            <p className="mt-2 text-[14.5px] text-mute">We don\'t do dynamic pricing AI or website builders. We do the core.</p>\n          </header>\n          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">',
  '        <div className="mx-auto max-w-[1160px] px-5">\n          <header className="mb-10">\n            <h2 className="font-display text-[26px] font-bold">Capabilities, strictly scoped.</h2>\n            <p className="mt-2 text-[14.5px] text-mute">We don\'t do dynamic pricing AI or website builders. We do the core.</p>\n          </header>\n          <StaggerGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={150}>'
);
code = code.replace(
  '              </div>\n            ))}\n          </div>\n        </div>\n      </section>',
  '              </div>\n            ))}\n          </StaggerGroup>\n        </div>\n        </Reveal>\n      </section>'
);

code = code.replace(
  '<section id="integrations" className="border-t border-line py-14">',
  '<section id="integrations" className="border-t border-line py-14">\n        <Reveal direction="left" distance={60}>'
);
code = code.replace(
  '          </div>\n        </div>\n      </section>',
  '          </div>\n        </div>\n        </Reveal>\n      </section>'
);

code = code.replace(
  '<section id="pricing" className="border-t border-line bg-paper/60 py-20">',
  '<section id="pricing" className="border-t border-line bg-paper/60 py-20">\n        <Reveal direction="up" distance={50}>'
);
code = code.replace(
  '        <div className="mx-auto max-w-[1160px] px-5">\n          <header className="mb-10 text-center">\n            <h2 className="font-display text-[26px] font-bold">Straightforward Pricing</h2>\n            <p className="mt-2 text-[14.5px] text-mute">No % cuts, no setup fees. Pay for the units you operate.</p>\n          </header>\n          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">',
  '        <div className="mx-auto max-w-[1160px] px-5">\n          <header className="mb-10 text-center">\n            <h2 className="font-display text-[26px] font-bold">Straightforward Pricing</h2>\n            <p className="mt-2 text-[14.5px] text-mute">No % cuts, no setup fees. Pay for the units you operate.</p>\n          </header>\n          <StaggerGroup className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2" stagger={200}>'
);
code = code.replace(
  '            </div>\n\n          </div>\n        </div>\n      </section>',
  '            </div>\n\n          </StaggerGroup>\n        </div>\n        </Reveal>\n      </section>'
);

code = code.replace(
  '<section id="security" className="border-t border-line py-16">',
  '<section id="security" className="border-t border-line py-16">\n        <Reveal direction="up">'
);
code = code.replace(
  '          </div>\n        </div>\n      </section>',
  '          </div>\n        </div>\n        </Reveal>\n      </section>'
);

fs.writeFileSync('src/modules/Public.tsx', code);
