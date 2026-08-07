import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/bantlar ── Tüm bantları getir
router.get("/", async (req, res) => {
  try {
    const bantlar = await prisma.bant.findMany({
      include: {
        hat: true, // Hangi hatta ait olduğu bilgisini de ekle
      },
    });
    res.json(bantlar);
  } catch (error) {
    console.error("Bantları çekerken hata:", error);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

// ── GET /api/bantlar/:id ── Spesifik bir bandı getir
router.get("/:id", async (req, res) => {
  try {
    const bant = await prisma.bant.findUnique({
      where: { id: req.params.id },
      include: {
        hat: true,
      },
    });

    if (!bant) {
      // return ekleyerek typescript hatasını önlüyoruz
      res.status(404).json({ error: "Bant bulunamadı." });
      return; 
    }

    res.json(bant);
  } catch (error) {
    console.error("Bant detayı çekerken hata:", error);
    res.status(500).json({ error: "Sunucu hatası oluştu." });
  }
});

export default router;
