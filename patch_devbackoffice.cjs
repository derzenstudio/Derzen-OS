const fs = require('fs');
let code = fs.readFileSync('src/modules/DevBackoffice.tsx', 'utf8');

code = code.replace(
  `<span className="ml-auto rounded-full bg-gray-100 dark:bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold text-gray-600 dark:text-white/50">session: mira.k@ · support · MFA ✓</span>`,
  `<button onClick={() => useApp.getState().setTheme(useApp.getState().theme === "dark" ? "light" : "dark")} className="ml-auto flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 mr-2">
            <Ic name="moon" size={14} className="hidden dark:block" />
            <Ic name="sun" size={14} className="block dark:hidden" />
          </button>
          <span className="rounded-full bg-gray-100 dark:bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold text-gray-600 dark:text-white/50">session: mira.k@ · support · MFA ✓</span>`
);

fs.writeFileSync('src/modules/DevBackoffice.tsx', code);
