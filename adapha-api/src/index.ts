import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Sağlık kontrolü ────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    uygulama: "Adapha API",
    versiyon: "1.0.0",
    zaman: new Date().toISOString(),
  });
});

// ── Sunucuyu başlat ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Adapha API çalışıyor: http://localhost:${PORT}\n`);
});
