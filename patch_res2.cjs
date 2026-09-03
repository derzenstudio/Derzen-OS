const fs = require('fs');
let code = fs.readFileSync('src/modules/Reservations.tsx', 'utf8');

// Clean up broken tags
code = code.replace(/<\/Reveal>/g, '').replace(/<Reveal[^>]*>/g, '');

code = code.replace(
  '<div className="flex flex-wrap items-center gap-2">',
  '<Reveal direction="down" distance={10}><div className="flex flex-wrap items-center gap-2">'
);
code = code.replace(
  '${list.length} rows\`); }}>Export</Btn>\n      </div>',
  '${list.length} rows\`); }}>Export</Btn>\n      </div></Reveal>'
);
code = code.replace(
  '<div className="overflow-x-auto rounded-xl border border-line bg-card">',
  '<Reveal direction="up" distance={20} delay={100}><div className="overflow-x-auto rounded-xl border border-line bg-card">'
);
code = code.replace(
  '        </table>\n      </div>\n    </div>\n  );\n}',
  '        </table>\n      </div></Reveal>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Reservations.tsx', code);
