const fs = require('fs');
let code = fs.readFileSync('src/modules/Public.tsx', 'utf8');

// The replacement script missed the target blocks because they were different from what I expected.
// So I will just manually insert `</Reveal>` before `</section>` for the specific sections.

code = code.replace(
  '        </div>\n      </section>\n\n      {/* Integrations marquee */}',
  '        </div>\n        </Reveal>\n      </section>\n\n      {/* Integrations marquee */}'
);

code = code.replace(
  '          </div>\n        </div>\n      </section>\n\n      {/* Pricing',
  '          </div>\n        </div>\n        </Reveal>\n      </section>\n\n      {/* Pricing'
);

code = code.replace(
  '        </div>\n      </section>\n\n      {/* Security / tenancy */}',
  '        </div>\n        </Reveal>\n      </section>\n\n      {/* Security / tenancy */}'
);

code = code.replace(
  '        </div>\n      </main>\n    </div>\n  );\n}',
  '        </div>\n        </Reveal>\n      </main>\n    </div>\n  );\n}'
);

fs.writeFileSync('src/modules/Public.tsx', code);
