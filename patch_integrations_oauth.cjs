const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

const replacement = `  const { toast, connectIntegrationAccount } = useApp();
  const [accName, setAccName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const accountName = accName || "Default Account";

    if (isOAuth) {
      setIsConnecting(true);
      try {
        const redirectUri = \`\${window.location.origin}/auth/callback\`;
        
        // 1. Fetch Auth URL from our backend
        const res = await fetch(\`/api/auth/url?provider=\${appId}&redirect_uri=\${encodeURIComponent(redirectUri)}\`);
        if (!res.ok) throw new Error("Failed to get auth URL");
        const { url } = await res.json();
        
        // 2. Open popup
        const width = 500, height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const authWindow = window.open(url, 'oauth_popup', \`width=\${width},height=\${height},left=\${left},top=\${top}\`);
        
        if (!authWindow) {
          toast("error", "Popup blocked", "Please allow popups to connect this integration.");
          setIsConnecting(false);
          return;
        }

        // 3. Listen for success message
        const handleMessage = (event: MessageEvent) => {
          if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
          
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            connectIntegrationAccount(appId, accountName);
            toast("ok", "Integration authorized", "Secure connection established successfully.");
            setIsConnecting(false);
            onClose();
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Cleanup if user closes the window manually
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setIsConnecting(false);
          }
        }, 1000);

      } catch (err) {
        console.error(err);
        toast("error", "Connection failed", "Could not initiate the OAuth flow.");
        setIsConnecting(false);
      }
    } else {
      connectIntegrationAccount(appId, accountName);
      toast("ok", "Integration authorized", "Secure connection established successfully.");
      onClose();
    }
  };`;

const startIndex = code.indexOf('  const { toast, connectIntegrationAccount } = useApp();');
const endIndex = code.indexOf('const isOAuth = ["stripe", "paypal", "xendit", "airbnb", "booking", "vrbo"].includes(appId);');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + '\n  ' + code.substring(endIndex);
  fs.writeFileSync('src/modules/Integrations.tsx', code);
} else {
  console.log("Could not find insertion points");
}
