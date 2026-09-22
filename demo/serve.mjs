// Minimal static file server for the demo/ folder — no dependencies.
// Serving over http:// instead of file:// avoids Chrome's separate
// "Allow access to file URLs" per-extension permission, which content
// scripts do NOT get by default and which is easy to fail to grant/persist
// via the chrome://extensions UI.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4173);

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

const server = createServer(async (req, res) => {
  const path = req.url === "/" ? "/inaccessible-form.html" : req.url;
  try {
    const filePath = join(dir, decodeURIComponent(path.split("?")[0]));
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Demo server running at http://localhost:${port}/`);
});
