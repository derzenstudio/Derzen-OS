const fs = require('fs');
let code = fs.readFileSync('src/modules/Dashboard.tsx', 'utf8');

// The `</div>` for the 3-column grid is right above Tasks:
//        </section>
//      </div>
//      {/* Tasks & reminders */}

code = code.replace(
  '        </section>\n      </div>\n      {/* Tasks & reminders */}',
  '        </section>\n      </StaggerGroup>\n      {/* Tasks & reminders */}'
);

// We also need to fix the bottom, because the previous script messed up the bottom by removing the closing `</div>` for the main wrapper.
code = code.replace(
  '      </section>\n    </StaggerGroup>\n  );\n}',
  '      </section>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Dashboard.tsx', code);
