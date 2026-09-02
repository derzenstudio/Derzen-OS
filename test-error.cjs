const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "dist/index.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost/" });
dom.window.addEventListener("error", (event) => {
  console.log("JSDOM Error:", event.error.stack);
});
setTimeout(() => {
  console.log("Done");
}, 2000);
