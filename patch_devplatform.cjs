const fs = require('fs');
let code = fs.readFileSync('src/modules/DevPlatform.tsx', 'utf8');

code = code.replace(
  `import { useApp } from "../store";`,
  `import { useApp } from "../store";\nimport { usePlatformStore } from "../lib/platformStore";`
);

code = code.replace(
  `const [list, setList] = useState(ANNOUNCEMENTS);`,
  `const list = usePlatformStore(s => s.announcements);\n  const setList = usePlatformStore(s => s.setAnnouncements);`
);

code = code.replace(
  `const [flags, setFlags] = useState(PLATFORM_FLAGS);`,
  `const flags = usePlatformStore(s => s.flags);\n  const setFlags = usePlatformStore(s => s.setFlags);`
);

code = code.replace(
  `const [registry, setRegistry] = useState(COMING_SOON);`,
  `const registry = usePlatformStore(s => s.registry);\n  const setRegistry = usePlatformStore(s => s.setRegistry);`
);

fs.writeFileSync('src/modules/DevPlatform.tsx', code);
