fetch("http://localhost:3000/api/ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ system: "Say OK", user: "Say OK" })
}).then(res => res.text()).then(console.log);
