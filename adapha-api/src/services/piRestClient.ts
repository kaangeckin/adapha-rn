import axios from "axios";
import { prisma } from "../lib/prisma";

// Axios instance with a timeout so we don't hang if Pi is down
const createClient = (ip: string, port: number = 8000) => axios.create({
  baseURL: `http://${ip}:${port}`,
  timeout: 5000,
});

/**
 * Pi'deki Olay Geçmişini çeker ve veritabanına kaydeder
 */
export async function syncEvents(bantId: string, piIp: string, piPort: number = 8000) {
  try {
    const api = createClient(piIp, piPort);
    const res = await api.get(`/machines/${bantId}/events?hours=24`);
    
    const events = Array.isArray(res.data) ? res.data : [];

    for (const ev of events) {
      // type, start, end, duration_s, meta
      const tarih = ev.start ? new Date(ev.start) : new Date();
      const tip = ev.type || "Bilinmeyen Olay";
      await prisma.olay.upsert({
        where: {
          bantId_tip_tarih: { bantId, tip, tarih }
        },
        update: {
          sure: ev.duration_s !== undefined ? Number(ev.duration_s) : null,
          durum: ev.end ? "Tamamlandı" : "Devam Ediyor",
        },
        create: {
          bantId,
          tarih,
          sure: ev.duration_s !== undefined ? Number(ev.duration_s) : null,
          birim: ev.meta?.esik_sn ? `Eşik: ${ev.meta.esik_sn}s` : "",
          baslik: ev.meta?.title || ev.type || "Bilinmeyen Olay",
          durum: ev.end ? "Tamamlandı" : "Devam Ediyor",
          tip,
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
export async function syncSamples(bantId: string, piIp: string, piPort: number = 8000) {
  try {
    const api = createClient(piIp, piPort);
    const res = await api.get(`/machines/${bantId}/samples?hours=8&limit=2000`);
    
    const samples = Array.isArray(res.data) ? res.data : [];

    for (const s of samples) {
      if (s.valid === false) continue; // Hatalı verileri atla

      const ts = s.ts ? new Date(s.ts) : new Date();
      await prisma.trend.upsert({
        where: {
          bantId_timestamp: { bantId, timestamp: ts }
        },
        update: {
          hiz: Number(s.speed || 0),
          miktar: Number(s.total || 0),
          kaliteOrani: Number(s.rate || 0),
        },
        create: {
          bantId,
          timestamp: ts,
          hiz: Number(s.speed || 0),
          miktar: Number(s.total || 0),
          kaliteOrani: Number(s.rate || 0),
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
export async function syncOee(bantId: string, piIp: string, piPort: number = 8000) {
  try {
    const api = createClient(piIp, piPort);
    const res = await api.get(`/machines/${bantId}/oee`);
    
    const oeeData = res.data;
    const oeeVal = oeeData?.oee ? oeeData.oee * 100 : 0; // 0.886 -> %88.6
    
    if (oeeVal > 0) {
      // Dakika bazında timestamp (saniye ve milisaniye sıfırla)
      const simdi = new Date();
      simdi.setSeconds(0, 0);

      await prisma.trend.upsert({
        where: {
          bantId_timestamp: {
            bantId,
            timestamp: simdi,
          }
        },
        update: {
          oee: oeeVal,
        },
        create: {
          bantId,
          timestamp: simdi,
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
export async function getExportCsv(piIp: string, piPort: number = 8000) {
  try {
    const api = createClient(piIp, piPort);
    const res = await api.get("/export.csv?hours=24", { responseType: 'stream' });
    return res.data;
  } catch (err: any) {
    console.error(`❌ CSV çekilemedi:`, err.message);
    return null;
  }
}
