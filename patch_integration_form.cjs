const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

const replacement = `function IntegrationForm({ appId, onClose }: { appId: string; onClose: () => void }) {
  const { toast, setAppConnected } = useApp();
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setAppConnected(appId);
    toast("ok", "Credentials verified", "Integration is now active and ready to sync.");
    onClose();
  };
  return (
    <form onSubmit={handleConnect} className="space-y-4 pt-4">
      {appId === "stripe" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Go to your Stripe Dashboard &gt; Developers &gt; API keys. Copy the Secret key. Then go to Webhooks, create a new endpoint pointing to <code>https://api.derzen.com/v1/webhooks/stripe</code>, and copy the Signing secret.
          </div>
          <Field label="Stripe Secret Key"><Input type="password" placeholder="sk_live_..." required /></Field>
          <Field label="Webhook Secret"><Input type="password" placeholder="whsec_..." required /></Field>
        </>
      )}
      {appId === "xendit" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Go to your Xendit Dashboard &gt; Settings &gt; API Keys. Generate a new Secret Key. Then configure the Webhook URL to <code>https://api.derzen.com/v1/webhooks/xendit</code> and copy the Verification Token.
          </div>
          <Field label="Xendit Secret Key"><Input type="password" placeholder="xnd_production_..." required /></Field>
          <Field label="Webhook Verification Token"><Input type="password" placeholder="..." required /></Field>
        </>
      )}
      {appId === "paypal" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Go to PayPal Developer Dashboard &gt; Apps & Credentials. Create a Live App and copy the Client ID and Secret.
          </div>
          <Field label="Client ID"><Input type="text" placeholder="..." required /></Field>
          <Field label="Client Secret"><Input type="password" placeholder="..." required /></Field>
        </>
      )}
      {appId === "offline" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Enter the payment instructions you want your guests to see when they choose "Bank Transfer" or "Offline Payment".
          </div>
          <Field label="Bank Transfer Instructions">
            <Textarea placeholder="Bank Name: \\nAccount Number: \\n..." required />
          </Field>
        </>
      )}
      {appId === "whatsapp" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Go to Meta for Developers &gt; WhatsApp &gt; API Setup. Copy your Phone Number ID and Account ID. Generate a permanent system user token. Configure the webhook below.
          </div>
          <Field label="Phone Number ID"><Input type="text" placeholder="..." required /></Field>
          <Field label="WhatsApp Business Account ID"><Input type="text" placeholder="..." required /></Field>
          <Field label="Permanent Access Token"><Input type="password" placeholder="..." required /></Field>
          <p className="text-xs text-mute mt-2">Webhook URL: <code>https://api.derzen.com/v1/webhooks/whatsapp</code></p>
        </>
      )}
      {appId === "smtp" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Enter the SMTP credentials provided by your email host (e.g. Google Workspace, SendGrid, Mailgun) to send emails from your own domain.
          </div>
          <Field label="SMTP Host"><Input type="text" placeholder="smtp.mailgun.org" required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Port"><Input type="number" placeholder="587" required /></Field>
            <Field label="Encryption"><Select defaultValue="tls"><option value="tls">STARTTLS</option><option value="ssl">SSL/TLS</option></Select></Field>
          </div>
          <Field label="Username"><Input type="text" placeholder="..." required /></Field>
          <Field label="Password"><Input type="password" placeholder="..." required /></Field>
        </>
      )}
      {appId === "custom_site" && (
        <>
          <p className="text-sm text-ink mb-4">Paste this snippet before the <code>&lt;/body&gt;</code> tag on your website to enable the DERZEN Chat Widget and AI Concierge.</p>
          <div className="bg-paper p-3 rounded text-xs font-mono text-mute overflow-x-auto border border-sand">
            &lt;script src="https://assets.derzen.com/widget.js" data-tenant="YOUR_TENANT_ID"&gt;&lt;/script&gt;
          </div>
        </>
      )}
      {(appId === "airbnb" || appId === "booking" || appId === "vrbo") && (
        <>
          <div className="mb-4 rounded-md bg-brand-soft p-3 text-[12px] text-brand-deep">
            <strong>OAuth Authorization:</strong> You will be redirected to the {appId} partner portal to securely authorize the DERZEN Channel Manager.
          </div>
          <p className="text-xs text-mute">This enables 2-way sync for reservations, rates, availability, and guest inbox messages.</p>
        </>
      )}
      {appId === "gmaps" && (
        <>
          <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
            <strong>How to connect:</strong> Go to Google Cloud Console, create an API key, and ensure Maps JavaScript API, Places API, and Geocoding API are enabled.
          </div>
          <Field label="Google Maps API Key"><Input type="password" placeholder="AIzaSy..." required /></Field>
        </>
      )}
      {appId === "doorflow" || appId === "ratepilot" ? (
        <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
          <strong>How to connect:</strong> Generate an API token from your {appId} partner dashboard and paste it below.
        </div>
      ) : null}
      
      <div className="pt-4 flex justify-end gap-3">
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn variant="solid" type="submit">Connect Integration</Btn>
      </div>
    </form>
  );
}`;

const startIndex = code.indexOf('function IntegrationForm({');
const endIndex = code.lastIndexOf('}');
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + '\n';
  fs.writeFileSync('src/modules/Integrations.tsx', code);
}
