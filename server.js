const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".css":  "text/css",
  ".svg":  "image/svg+xml",
  ".jpg":  "image/jpeg",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, "index.html");
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n✅  Clínica Virtual Cardiometabólica corriendo en:`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`   Abre esa URL en tu navegador.`);
  console.log(`   Presiona Ctrl+C para detener.\n`);
});
