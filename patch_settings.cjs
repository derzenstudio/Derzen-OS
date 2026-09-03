const fs = require('fs');
let code = fs.readFileSync('src/modules/Settings.tsx', 'utf8');

code = code.replace(
  'import { Btn, Dot, Empty, Field, Input, Modal, Select, Tabs, Toggle } from "../components/ui";',
  'import { Btn, Dot, Empty, Field, Input, Modal, Select, Tabs, Toggle } from "../components/ui";\nimport { PaymentModal } from "../components/PaymentModal";'
);

// We need to add state and rendering for PaymentModal in Billing
code = code.replace(
  'const [portalOpen, setPortalOpen] = useState(false);',
  'const [portalOpen, setPortalOpen] = useState(false);\n  const [payPlan, setPayPlan] = useState<{id: string, price: number} | null>(null);'
);

code = code.replace(
  '<Btn size="sm" variant={currentPlan === p.id ? "solid" : "outline"} disabled={currentPlan === p.id} onClick={() => { setTenantPlan(tenantId, p.id); toast("ok", "Plan updated", \`Switched to \${p.id}\`); }}>',
  '<Btn size="sm" variant={currentPlan === p.id ? "solid" : "outline"} disabled={currentPlan === p.id} onClick={() => setPayPlan({ id: p.id, price: p.price })}>'
);

code = code.replace(
  '{portalOpen && (',
  '{payPlan && (\n        <PaymentModal\n          open={true}\n          onClose={() => setPayPlan(null)}\n          plan={payPlan.id}\n          price={payPlan.price}\n          onComplete={() => {\n            setTenantPlan(tenantId, payPlan.id);\n            setPayPlan(null);\n            toast("ok", "Plan updated", \`Successfully upgraded to \${payPlan.id}\`);\n          }}\n        />\n      )}\n      {portalOpen && ('
);

fs.writeFileSync('src/modules/Settings.tsx', code);
