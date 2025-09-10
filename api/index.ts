let handler;

try {
  // 👉 Probeer eerst de build-versie (voor Vercel)
  handler = require("../dist/index").handler;
} catch (err) {
  // 👉 Val terug op de TypeScript versie (voor lokaal dev)
  handler = require("../index").handler;
}

export default handler;
