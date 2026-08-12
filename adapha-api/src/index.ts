import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { prisma } from "./lib/prisma";

import bantlarRouter from "./routes/bantlar";
import dashboardRouter from "./routes/dashboard";
import uretimRouter from "./routes/uretim";
import analitikRouter from "./routes/analitik";
import piRouter from "./routes/pi";
import adminRouter from "./routes/admin";
import { baslatPiSync } from "./services/piSync";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// ── Socket.IO Kurulumu ──────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Mobil uygulamanın her yerden bağlanabilmesi için
  },
});
export const getIo = () => io;

io.on("connection", (socket) => {
  console.log(`Yeni bir mobil uygulama bağlandı: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Uygulama bağlantısı koptu: ${socket.id}`);
  });
});



// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Router ──────────────────────────────────────────────────────────────
app.use("/api/bantlar", bantlarRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/uretim", uretimRouter);
app.use("/api/analitik", analitikRouter);
app.use("/api/pi", piRouter);
app.use("/api/admin", adminRouter);

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

// ── Sunucuyu Başlat ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Adapha API çalışıyor: http://localhost:${PORT}`);
  console.log(`📡 WebSocket dinleniyor...`);
  
  // Raspberry Pi Sync servisini başlat
  baslatPiSync(io);
});
