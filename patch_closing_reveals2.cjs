const fs = require('fs');
let code = fs.readFileSync('src/modules/Public.tsx', 'utf8');

code = code.replace(
  '          </p>\n        </div>\n      </section>\n\n      {/* Pricing',
  '          </p>\n        </div>\n        </Reveal>\n      </section>\n\n      {/* Pricing'
);

code = code.replace(
  '            </div>\n          )}\n        </div>\n      </main>',
  '            </div>\n          )}\n        </div>\n        </Reveal>\n      </main>'
);

fs.writeFileSync('src/modules/Public.tsx', code);
