const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `import { Shell } from "./components/Shell";`,
  `import { Shell } from "./components/Shell";\nimport { AnimateMount } from "./components/AnimateMount";`
);

code = code.replace(
  `return (\n      <Suspense fallback={<LoadingSurface />}>\n        {route.path[0] === "login" ? <LoginPage /> : <PublicSite />}\n      </Suspense>\n    );`,
  `return (\n      <Suspense fallback={<LoadingSurface />}>\n        <AnimateMount>{route.path[0] === "login" ? <LoginPage /> : <PublicSite />}</AnimateMount>\n      </Suspense>\n    );`
);

code = code.replace(
  `return (\n    <Shell>\n      <Suspense fallback={<LoadingSurface />}>\n        <Component />\n      </Suspense>\n    </Shell>\n  );`,
  `return (\n    <Shell>\n      <Suspense fallback={<LoadingSurface />}>\n        <AnimateMount><Component /></AnimateMount>\n      </Suspense>\n    </Shell>\n  );`
);

fs.writeFileSync('src/App.tsx', code);
