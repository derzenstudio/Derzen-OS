const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
  'const isOAuth = ["stripe", "paypal", "xendit", "airbnb", "booking", "vrbo"].includes(appId);',
  ''
);

code = code.replace(
  'const { toast, connectIntegrationAccount } = useApp();',
  'const isOAuth = ["stripe", "paypal", "xendit", "airbnb", "booking", "vrbo"].includes(appId);\n  const { toast, connectIntegrationAccount } = useApp();'
);

code = code.replace(
  'onClick={() => handleConnect()}',
  'onClick={handleConnect} loading={isConnecting} disabled={isConnecting}'
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
