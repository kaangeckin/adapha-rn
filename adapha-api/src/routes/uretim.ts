import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/uretim/partiler ── Tüm üretim partilerini getir
router.get("/partiler", async (req, res) => {
  try {
    const partiler = await prisma.uretimPartisi.findMany({
      include: {
        hat: true,
        kaliteKontrol: true,
      },
      orderBy: { baslangic: 'desc' }
    });
    res.json(partiler);
  } catch (error) {
    console.error("Partileri çekerken hata:", error);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ── GET /api/uretim/kalite-dagilimi ── Pasta grafik için kalite verileri
router.get("/kalite-dagilimi", async (req, res) => {
  try {
    // Tüm partilerin kalite verilerini topla
    const kaliteVerileri = await prisma.kaliteKontrol.findMany();
    
    let iyi = 0;
    let uyari = 0;
    let red = 0;

    kaliteVerileri.forEach(k => {
      iyi += (k.iyiBirim || 0);
      uyari += (k.uyariBirim || 0);
      red += (k.redBirim || 0);
    });

    res.json([
      { name: "İyi", count: iyi, color: "#10b981", legendFontColor: "#7F7F7F" },
      { name: "Uyarı", count: uyari, color: "#f59e0b", legendFontColor: "#7F7F7F" },
      { name: "Red", count: red, color: "#ef4444", legendFontColor: "#7F7F7F" }
    ]);
  } catch (error) {
    console.error("Kalite dağılımı çekerken hata:", error);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ── GET /api/uretim/hiz-profili ── Çizgi grafik için hız verileri (simüle)
router.get("/hiz-profili", async (req, res) => {
  try {
    // Gerçekte bu veriler UretimKaydi tablosundan zamana göre çekilir
    // Frontend şu an statik bir dizi beklediği için ona uygun format dönüyoruz
    res.json({
      labels: ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"],
      datasets: [
        {
          data: [42, 45, 44, 46, 43, 45.2],
          color: () => `rgba(14, 165, 233, 1)`,
        }
      ]
    });
  } catch (error) {
    console.error("Hız profili çekerken hata:", error);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

export default router;
