import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// ── GET /api/analitik/radar ── Radar grafik verisi
router.get("/radar", async (req, res) => {
  try {
    // Gerçekte bunlar formüllerle hesaplanır. 
    // Örnek olarak bazı metrikleri simüle, bazılarını db'den besleyebiliriz.
    res.json([
      { label: "Hız", value: 72 },
      { label: "Kalite", value: 98 },
      { label: "Verimlilik", value: 85 },
      { label: "Çalışma", value: 78 },
      { label: "Hassasiyet", value: 90 },
      { label: "Güvenilir.", value: 88 },
    ]);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ── GET /api/analitik/performans-tablosu ── Kritik hat durumları
router.get("/performans-tablosu", async (req, res) => {
  try {
    // Gerçekte bant hızları ve hat durumuna göre filtreleme yapılır.
    res.json([
      { oncelik: "Acil", hat: "Hat 3", durum: "Hız %40 < 50", aksiyon: "İncele" },
      { oncelik: "Yüksek", hat: "Hat 7", durum: "Verimlilik %72", aksiyon: "Kontrol" },
      { oncelik: "Orta", hat: "Hat 4", durum: "Kalite %40 <90", aksiyon: "İzle" },
      { oncelik: "Canlı", hat: "Hat 1", durum: "Sertifika %98", aksiyon: "Aktif" },
    ]);
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ── GET /api/analitik/isi-haritasi ── Isı haritası (Heatmap) verisi
router.get("/isi-haritasi", async (req, res) => {
  try {
    res.json({
      hatlar: ["Hat 1", "Hat 2", "Hat 3", "Hat 4", "Hat 5", "Hat 6", "Hat 7", "Hat 8"],
      sutunlar: ["Hız", "Kal", "Vrl", "Çal", "Has", "Güv"],
      degerler: [
        [90, 88, 82, 78, 70, 65], [95, 92, 88, 85, 78, 72], [72, 68, 62, 55, 45, 38],
        [85, 82, 75, 68, 60, 52], [80, 76, 70, 64, 55, 48], [88, 84, 78, 72, 64, 58],
        [70, 66, 60, 52, 44, 36], [92, 89, 82, 76, 68, 62],
      ]
    });
  } catch (error) {
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

export default router;
