const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

const replacement = `function IntegrationForm({ appId, onClose }: { appId: string; onClose: () => void }) {
  const { toast, setAppConnected } = useApp();
  
  const handleConnect = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppConnected(appId);
    toast("ok", "Integration authorized", "Secure connection established successfully.");
    onClose();
  };

  const isOAuth = ["stripe", "paypal", "xendit", "airbnb", "booking", "vrbo"].includes(appId);
  
  return (
    <div className="pt-4">
      {isOAuth ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center p-6 border border-line rounded-lg bg-paper/50 text-center">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-line flex items-center justify-center mb-4">
              <Ic name="plug" size={20} className="text-brand" />
            </div>
            <h3 className="text-sm font-bold text-ink mb-2">Secure OAuth Connection</h3>
            <p className="text-xs text-mute max-w-[280px] leading-relaxed">
              DERZEN acts as the registered platform. You don't need to generate API keys. You will be redirected to securely log in and authorize access.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant="solid" onClick={() => handleConnect()}>Authorize & Connect</Btn>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-4">
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
                <strong>Bring Your Own Account (BYOA):</strong> Connect a custom WhatsApp Business Account.
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
                <strong>How to connect:</strong> Enter the SMTP credentials provided by your email host (e.g. Google Workspace, SendGrid, Mailgun).
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
              <p className="text-sm text-ink mb-4">Paste this snippet before the <code>&lt;/body&gt;</code> tag on your website to enable the DERZEN Chat Widget.</p>
              <div className="bg-paper p-3 rounded text-xs font-mono text-mute overflow-x-auto border border-sand">
                &lt;script src="https://assets.derzen.com/widget.js" data-tenant="YOUR_TENANT_ID"&gt;&lt;/script&gt;
              </div>
            </>
          )}
          {appId === "gmaps" && (
            <>
              <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
                <strong>Bring Your Own Key:</strong> Go to Google Cloud Console, create an API key, and ensure Maps JavaScript API, Places API, and Geocoding API are enabled.
              </div>
              <Field label="Google Maps API Key"><Input type="password" placeholder="AIzaSy..." required /></Field>
            </>
          )}
          {(appId === "doorflow" || appId === "ratepilot") && (
            <div className="mb-4 rounded-md bg-paper p-3 text-[12px] text-mute">
              <strong>How to connect:</strong> Generate an API token from your {appId} partner dashboard and paste it below.
            </div>
          )}
          
          <div className="pt-4 flex justify-end gap-3">
            <Btn variant="outline" onClick={onClose}>Cancel</Btn>
            <Btn variant="solid" type="submit">Save & Connect</Btn>
          </div>
        </form>
      )}
    </div>
  );
}`;

const startIndex = code.indexOf('function IntegrationForm({');
const endIndex = code.lastIndexOf('}');
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + '\n';
  fs.writeFileSync('src/modules/Integrations.tsx', code);
}
