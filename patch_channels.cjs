const fs = require('fs');
let code = fs.readFileSync('src/modules/Channels.tsx', 'utf8');

code = code.replace(
  /export default function Channels\(\{ tab: initialTab \}: \{ tab\?: string \}\) \{/,
  'export default function Channels({ tab: initialTab }: { tab?: string }) {\n  const route = useApp((s) => s.route);'
);

code = code.replace(
  /const \[tab, setTab\] = useState\(initialTab \?\? "dashboard"\);/,
  'const [tab, setTab] = useState(initialTab ?? (route.path[0] === "sync" ? "sync" : "dashboard"));'
);

fs.writeFileSync('src/modules/Channels.tsx', code);
