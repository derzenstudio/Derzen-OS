const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const correctViteInit = `
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const httpServer = app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on port \${PORT}\`);
    });
    
    // Prevent Vite from reading --port from process.argv and binding its own WS server
    const originalArgv = process.argv;
    process.argv = process.argv.filter(a => !a.includes('--port') && !a.includes('--host'));

    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    process.argv = originalArgv;
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
       if (req.method === 'GET' && !req.path.startsWith('/api')) {
         res.sendFile(path.join(distPath, 'index.html'));
       } else {
         next();
       }
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(\`Server running on port \${PORT}\`);
    });
  }
`;

code = code.replace(/\/\/ Vite middleware for development[\s\S]*\}\n\s*app\.listen\(PORT, "0\.0\.0\.0", \(\) => \{\n\s*console\.log\(\`Server running on port \$\{PORT\}\`\);\n\s*\}\);/, correctViteInit);

fs.writeFileSync('server.ts', code);
