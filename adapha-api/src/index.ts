import express from "express";
import cors from "cors";

import bantlarRouter from "./routes/bantlar";
import dashboardRouter from "./routes/dashboard";
import uretimRouter from "./routes/uretim";
import analitikRouter from "./routes/analitik";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Router ──────────────────────────────────────────────────────────────
app.use("/api/bantlar", bantlarRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/uretim", uretimRouter);
app.use("/api/analitik", analitikRouter);

// ── Bağlantı Kontrolü (Ping-Pong) ──────────────────────────────────────────
app.get("/api/ping", (_req, res) => {
  res.json({ status: "pong", message: "Bağlantı başarılı!", timestamp: new Date() });
});

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
