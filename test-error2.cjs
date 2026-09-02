const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, { runScripts: "dangerously", url: "http://localhost/" });
dom.window.addEventListener("error", (event) => {
  console.log("JSDOM Error:", event.error ? event.error.stack : event.message);
});

const jsFiles = fs.readdirSync(path.join(__dirname, "dist/assets")).filter(f => f.endsWith(".js"));
for (const file of jsFiles) {
  try {
    const code = fs.readFileSync(path.join(__dirname, "dist/assets", file), "utf8");
    dom.window.eval(code);
  } catch (e) {
    console.log("Eval Error in " + file + ":", e.stack);
  }
}
setTimeout(() => {
  console.log("Done");
}, 1000);
