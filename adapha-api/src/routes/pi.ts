import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { syncEvents, syncSamples, syncOee, getExportCsv } from "../services/piRestClient";

const router = Router();
const prisma = new PrismaClient();

// Yardımcı: Bant id'sine göre IP bul
async function getPiIp(bantId: string) {
  const bant = await prisma.bant.findUnique({ where: { id: bantId } });
  return bant?.piIpAdresi || null;
}

// Olay Geçmişi (Events)
router.get("/:bantId/events", async (req, res) => {
  const { bantId } = req.params;
  const ip = await getPiIp(bantId);
  
  if (ip) {
    // Pi'den çekip DB'ye kaydeder (senkronize eder)
    const freshEvents = await syncEvents(bantId, ip);
    return res.json(freshEvents);
  }

  // Pi yoksa veya bağlı değilse DB'den son olayları getir (simülasyon/cache)
  const dbEvents = await prisma.olay.findMany({
    where: { bantId },
    orderBy: { tarih: "desc" },
    take: 10
  });
  res.json(dbEvents);
});

// Trend Verisi (Samples)
router.get("/:bantId/samples", async (req, res) => {
  const { bantId } = req.params;
  const ip = await getPiIp(bantId);

  if (ip) {
    const freshSamples = await syncSamples(bantId, ip);
    return res.json(freshSamples);
  }

  const dbSamples = await prisma.trend.findMany({
    where: { bantId },
    orderBy: { timestamp: "desc" },
    take: 20
  });
  res.json(dbSamples);
});

// Anlık OEE
router.get("/:bantId/oee", async (req, res) => {
  const { bantId } = req.params;
  const ip = await getPiIp(bantId);

  if (ip) {
    const oeeData = await syncOee(bantId, ip);
    return res.json(oeeData);
  }

  // Simüle edilmiş / son kaydedilen OEE
  const lastTrend = await prisma.trend.findFirst({
    where: { bantId, oee: { not: null } },
    orderBy: { timestamp: "desc" }
  });
  res.json({ oee: lastTrend?.oee || 0 });
});

// Rapor Çıktısı (Export CSV)
router.get("/:bantId/export.csv", async (req, res) => {
  const { bantId } = req.params;
  const ip = await getPiIp(bantId);

  if (ip) {
    const stream = await getExportCsv(ip);
    if (stream) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="export-${bantId}.csv"`);
      return stream.pipe(res);
    }
  }

  res.status(404).send("CSV bulunamadı veya Pi bağlantısı yok.");
});

export default router;
