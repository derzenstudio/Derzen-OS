const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
  'toast("error", "Popup blocked", "Please allow popups to connect this integration.");',
  'toast("err", "Popup blocked", "Please allow popups to connect this integration.");'
);

code = code.replace(
  'toast("error", "Connection failed", "Could not initiate the OAuth flow.");',
  'toast("err", "Connection failed", "Could not initiate the OAuth flow.");'
);

code = code.replace(
  'loading={isConnecting} disabled={isConnecting}',
  'disabled={isConnecting}'
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
