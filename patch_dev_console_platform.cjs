const fs = require('fs');
let code = fs.readFileSync('src/modules/DevConsole.tsx', 'utf8');

code = code.replace(
  /\["PostgreSQL \(RLS\)", "primary \+ 2 replicas", "healthy", "db-1\.internal"\],/g,
  '["Zustand Store", "Local storage persistence", "healthy", "derzen.store.v1"],'
);
code = code.replace(
  /\["Redis \/ BullMQ", "queues \+ cache", "healthy", "depth 3 · 4 workers"\],/g,
  '["AI Proxy", "Server-side Express proxy", "healthy", "/api/ai"],'
);
code = code.replace(
  /\["S3-compatible storage", "photos · receipts · docs", "healthy", `\$\{WORKSPACE.name\} bucket`\],/g,
  '["Platform Registry", "Local state manager", "healthy", "derzen.platform.v1"],'
);
code = code.replace(
  /\["OTel collector", "traces across sync path", "healthy", "p95 calendar 312ms"\],/g,
  '["Authentication", "Local developer fallback", "healthy", "derzen.devteam.v1"],'
);
code = code.replace(
  /\["Sync workers", "channel push\/pull", "1 degraded", "vrbo worker retrying"\],/g,
  '["OTA Sync", "Background channel sync", "healthy", "mock simulation"],'
);

code = code.replace(
  '<p className="text-[12.5px] font-bold text-white/85">Cross-tenant isolation suite</p>',
  '<p className="text-[12.5px] font-bold text-white/85">State Integrity Check</p>'
);

code = code.replace(
  /✓ 214\/214 routes — tenant A token cannot read or mutate tenant B\. New routes auto-enrolled\./g,
  '✓ Pass — State validation successful. No orphaned reservations or broken links found.'
);

fs.writeFileSync('src/modules/DevConsole.tsx', code);
