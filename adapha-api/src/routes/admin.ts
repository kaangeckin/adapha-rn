import { Router } from "express";
import { prisma } from "../lib/prisma";
import { reconnectMakine } from "../services/piSync";
import { getIo } from "../index"; // io referansını almak için index.ts'den export edeceğiz

const router = Router();

// ── GET /api/admin/bantlar ── IP ve durum dahil bantları listele
router.get("/bantlar", async (req, res) => {
  try {
    const bantlar = await prisma.bant.findMany({
      orderBy: { id: "asc" }
    });
    res.json(bantlar);
  } catch (error) {
    res.status(500).json({ error: "Bantlar çekilemedi." });
  }
});

// ── PUT /api/admin/bant/:id/ip ── Bantın IP adresini değiştir ve yeniden bağlan
router.put("/bant/:id/ip", async (req, res) => {
  const { id } = req.params;
  const { piIpAdresi } = req.body;
  
  if (!piIpAdresi) {
    return res.status(400).json({ error: "IP Adresi gerekli." });
  }

  try {
    // Veritabanını güncelle
    const guncelBant = await prisma.bant.update({
      where: { id },
      data: { piIpAdresi }
    });

    // io referansını index.ts üzerinden alıp bağlantıyı yenile
    const io = getIo();
    if (io) {
      reconnectMakine(id, piIpAdresi, io);
    }

    res.json({ success: true, bant: guncelBant });
  } catch (error) {
    res.status(500).json({ error: "IP adresi güncellenemedi." });
  }
});

// ── GET /api/admin/bildirimler ── Sistem bildirimlerini çek
router.get("/bildirimler", async (req, res) => {
  try {
    const bildirimler = await prisma.bildirim.findMany({
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json(bildirimler);
  } catch (error) {
    res.status(500).json({ error: "Bildirimler çekilemedi." });
  }
});

export default router;
