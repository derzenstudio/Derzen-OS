const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
`{isOAuth ? (
        <div className="space-y-4">
          <Field label="Account Nickname (e.g. My Airbnb, Business Stripe)">
            <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="Main Account" />
          </Field>
        <div className="space-y-4">`,
`{isOAuth ? (
        <div className="space-y-4">
          <Field label="Account Nickname (e.g. My Airbnb, Business Stripe)">
            <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="Main Account" />
          </Field>`
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
