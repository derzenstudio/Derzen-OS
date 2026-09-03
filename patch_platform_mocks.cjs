const fs = require('fs');
let code = fs.readFileSync('src/modules/DevPlatform.tsx', 'utf8');

code = code.replace(
  `{KB_COVERAGE.map((k) => (`,
  `{useApp(s => s.tenants).map((t) => (
            <div key={t.id} className="mb-2.5">
              <p className="mb-1 flex justify-between text-[11px]"><span className="font-bold text-gray-900 dark:text-gray-900 dark:text-white/80">{t.workspace}</span><span className={cx("font-mono font-bold", "text-[#e2a33c]")}>Calculating...</span></p>
            </div>
          ))}
          {/*`
);
code = code.replace(
  `</Panel>\n\n        <Panel title="Human-in-the-loop (HITL)"`,
  `*/}</Panel>\n\n        <Panel title="Human-in-the-loop (HITL)"`
);

code = code.replace(
  `{AI_COST.map((k) => (`,
  `{useApp(s => s.tenants).map((t) => (
              <div key={t.id} className="flex justify-between border-b border-gray-200 dark:border-white/5 py-1.5 last:border-0">
                <span className="text-[10.5px] font-bold text-gray-900 dark:text-white/60">{t.workspace}</span>
                <span className="font-mono text-[10.5px] text-gray-900 dark:text-white/40">Aggregating...</span>
              </div>
            ))}
          {/*`
);
code = code.replace(
  `</Panel>\n      </div>\n    </div>`,
  `*/}</Panel>\n      </div>\n    </div>`
);


fs.writeFileSync('src/modules/DevPlatform.tsx', code);
