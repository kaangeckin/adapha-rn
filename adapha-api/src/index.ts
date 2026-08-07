import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

import bantlarRouter from "./routes/bantlar";
import dashboardRouter from "./routes/dashboard";
import uretimRouter from "./routes/uretim";
import analitikRouter from "./routes/analitik";

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ── Socket.IO Kurulumu ──────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Mobil uygulamanın her yerden bağlanabilmesi için
  },
});

io.on("connection", (socket) => {
  console.log(`Yeni bir mobil uygulama bağlandı: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Uygulama bağlantısı koptu: ${socket.id}`);
  });
});

// ── Canlı Veri Simülatörü (Timer) ───────────────────────────────────────────
// Gerçek Raspberry Pi gelene kadar, her 3 saniyede bir rastgele hız dalgalanmaları oluşturup yayınlayalım
setInterval(async () => {
  try {
    const acikBantlar = await prisma.bant.findMany({ where: { durum: "acik" } });
    const guncellemeler = [];

    for (const bant of acikBantlar) {
      // Mevcut hız üzerinden -1 ile +1 arasında rastgele bir değişim yapalım
      let yeniHiz = (bant.anlikHiz || 0) + (Math.random() * 2 - 1);
      if (yeniHiz < 0) yeniHiz = 0; // Hız negatif olamaz
      
      yeniHiz = Number(yeniHiz.toFixed(1)); // Tek ondalık basamak

      await prisma.bant.update({
        where: { id: bant.id },
        data: { anlikHiz: yeniHiz, sonGuncelleme: new Date() }
      });

      guncellemeler.push({
        id: bant.id,
        anlikHiz: yeniHiz
      });
    }

    // Mobil uygulamalara güncellenen hızları tek bir paket halinde yayınlıyoruz!
    if (guncellemeler.length > 0) {
      io.emit("bant_hiz_guncelleme", guncellemeler);
    }
  } catch (error) {
    console.error("Simülatör hatası:", error);
  }
}, 3000); // Her 3 saniyede bir

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

// ── Sunucuyu Başlat ─────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Adapha API çalışıyor: http://localhost:${PORT}`);
  console.log(`📡 WebSocket dinleniyor...`);
});
