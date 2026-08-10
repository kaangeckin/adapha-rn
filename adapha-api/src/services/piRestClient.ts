import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Axios instance with a timeout so we don't hang if Pi is down
const createClient = (ip: string) => axios.create({
  baseURL: `http://${ip}:8000`,
  timeout: 5000,
});

/**
 * Pi'deki Olay Geçmişini çeker ve veritabanına kaydeder
 */
export async function syncEvents(bantId: string, piIp: string) {
  try {
    const api = createClient(piIp);
    const res = await api.get(`/machines/${bantId}/events?hours=24`);
    
    const events = Array.isArray(res.data) ? res.data : [];

    for (const ev of events) {
      // type, start, end, duration_s, meta
      await prisma.olay.create({
        data: {
          bantId,
          tarih: ev.start ? new Date(ev.start) : new Date(),
          sure: ev.duration_s ? `${ev.duration_s} sn` : "Belirsiz",
          birim: ev.meta?.esik_sn ? `Eşik: ${ev.meta.esik_sn}s` : "",
          baslik: ev.type || "Bilinmeyen Olay",
          durum: ev.end ? "Tamamlandı" : "Devam Ediyor",
          tip: ev.type,
        }
      });
    }
    return events;
  } catch (err: any) {
    console.error(`❌ [Bant ${bantId}] Events çekilemedi:`, err.message);
    return [];
  }
}

/**
 * Pi'deki Trend (Samples) verisini çeker ve veritabanına kaydeder
 */
export async function syncSamples(bantId: string, piIp: string) {
  try {
    const api = createClient(piIp);
    const res = await api.get(`/machines/${bantId}/samples?hours=8&limit=2000`);
    
    const samples = Array.isArray(res.data) ? res.data : [];

    for (const s of samples) {
      if (s.valid === false) continue; // Hatalı verileri atla

      await prisma.trend.create({
        data: {
          bantId,
          timestamp: s.ts ? new Date(s.ts) : new Date(),
          hiz: Number(s.speed || 0),
          miktar: Number(s.total || 0),
          oee: Number(s.rate || 0),
        }
      });
    }
    return samples;
  } catch (err: any) {
    console.error(`❌ [Bant ${bantId}] Samples çekilemedi:`, err.message);
    return [];
  }
}

/**
 * Pi'den anlık OEE değerini çeker (ve Trend'e yazar veya ayrı bir işlem yapar)
 */
export async function syncOee(bantId: string, piIp: string) {
  try {
    const api = createClient(piIp);
    const res = await api.get(`/machines/${bantId}/oee`);
    
    const oeeData = res.data;
    const oeeVal = oeeData?.oee ? oeeData.oee * 100 : 0; // 0.886 -> %88.6
    
    if (oeeVal > 0) {
      await prisma.trend.create({
        data: {
          bantId,
          oee: oeeVal,
        }
      });
    }

    return oeeData || { oee: 0 };
  } catch (err: any) {
    console.error(`❌ [Bant ${bantId}] OEE çekilemedi:`, err.message);
    return { oee: 0 };
  }
}

/**
 * Pi'den doğrudan CSV raporunu stream/proxy etmek için kullanılabilir.
 */
export async function getExportCsv(piIp: string) {
  try {
    const api = createClient(piIp);
    const res = await api.get("/export.csv?hours=24", { responseType: 'stream' });
    return res.data;
  } catch (err: any) {
    console.error(`❌ CSV çekilemedi:`, err.message);
    return null;
  }
}
