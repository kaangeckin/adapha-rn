import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/dashboard/ozet ── Ana ekrandaki üst metrikler
router.get("/ozet", async (req, res) => {
  try {
    // 1. Aktif Hat Sayısı
    const aktifHatlar = await prisma.hat.count({
      where: { durum: "aktif" },
    });

    // 2. Toplam Çıktı (Devam eden partilerdeki gerçekleşen üretim)
    const devamEdenPartiler = await prisma.uretimPartisi.findMany({
      where: { durum: "devam" },
      select: { gercekBirim: true },
    });
    
    const toplamCikti = devamEdenPartiler.reduce(
      (sum, parti) => sum + (parti.gercekBirim || 0),
      0
    );

    // 3. Ortalama Anlık Hız (Açık olan bantların hız ortalaması)
    const acikBantlar = await prisma.bant.findMany({
      where: { durum: "acik" },
      select: { anlikHiz: true },
    });

    const toplamHiz = acikBantlar.reduce(
      (sum, bant) => sum + (bant.anlikHiz || 0),
      0
    );
    const anlikHizOrta = acikBantlar.length > 0 ? (toplamHiz / acikBantlar.length).toFixed(1) : 0;

    res.json({
      aktifHatSayisi: aktifHatlar,
      toplamCikti: toplamCikti,
      anlikHizOrta: Number(anlikHizOrta),
    });
  } catch (error) {
    console.error("Dashboard özeti çekerken hata:", error);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

export default router;
