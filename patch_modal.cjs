const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf8');

code = code.replace(
  '{working ? "Processing..." : \\`Pay \\${money(price)}\\`} }',
  '{working ? "Processing..." : `Pay ${money(price)}`}'
);
code = code.replace(
  '{working ? "Processing..." : \\`Pay \\${money(price)}\\`}',
  '{working ? "Processing..." : `Pay ${money(price)}`}'
);

fs.writeFileSync('src/components/PaymentModal.tsx', code);
