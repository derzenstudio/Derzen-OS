const fs = require('fs');
let code = fs.readFileSync('src/modules/Public.tsx', 'utf8');

code = code.replace(
  'import { Btn, Ring, Toggle } from "../components/ui";',
  'import { Btn, Ring, Toggle } from "../components/ui";\nimport { PaymentModal } from "../components/PaymentModal";'
);

code = code.replace(
  'const [forgotEmail, setForgotEmail] = useState("");',
  'const [forgotEmail, setForgotEmail] = useState("");\n  const [payPlan, setPayPlan] = useState<{id: string, price: number} | null>(null);'
);

code = code.replace(
  '<Btn size="xs" variant="ghost" onClick={() => navigate("/login")}>Select</Btn>',
  '<Btn size="xs" variant="ghost" onClick={() => setPayPlan({ id: "Starter", price: 49 })}>Select</Btn>'
);

code = code.replace(
  '<Btn size="xs" variant="solid" onClick={() => navigate("/login")}>Select</Btn>',
  '<Btn size="xs" variant="solid" onClick={() => setPayPlan({ id: "Scale", price: 118 })}>Select</Btn>'
);

code = code.replace(
  '<Btn size="xs" variant="ghost" onClick={() => navigate("/login")}>Contact</Btn>',
  '<Btn size="xs" variant="ghost" onClick={() => setPayPlan({ id: "Enterprise", price: 499 })}>Select</Btn>'
);

code = code.replace(
  '{forgotOpen && (',
  '{payPlan && (\n        <PaymentModal\n          open={true}\n          onClose={() => setPayPlan(null)}\n          plan={payPlan.id}\n          price={payPlan.price}\n          onComplete={() => {\n            setPayPlan(null);\n            navigate("/login");\n          }}\n        />\n      )}\n      {forgotOpen && ('
);

fs.writeFileSync('src/modules/Public.tsx', code);
