import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Axios instance with a timeout so we don't hang if Pi is down
const createClient = (ip: string) => axios.create({
  baseURL: `http://${ip}`,
  timeout: 5000,
});

/**
 * Pi'deki Olay Geçmişini çeker ve veritabanına kaydeder
 */
export async function syncEvents(bantId: string, piIp: string) {
  try {
    const api = createClient(piIp);
    const res = await api.get(`/machines/${bantId}/events`);
    
    // Varsayım: res.data bir dizi Olay objesi dönüyor
    const events = Array.isArray(res.data) ? res.data : [];

    for (const ev of events) {
      // Çift kaydı önlemek için basit bir kontrol (Gerçekte benzersiz bir ID olsa daha iyi)
      // Şimdilik sadece kaydediyoruz
      await prisma.olay.create({
        data: {
          bantId,
          sure: String(ev.sure || ""),
          birim: String(ev.birim || ""),
          baslik: String(ev.baslik || ""),
          durum: String(ev.durum || ""),
          tip: String(ev.tip || ""),
          verim: String(ev.verim || ""),
          hata: String(ev.hata || ""),
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
    const res = await api.get(`/machines/${bantId}/samples`);
    
    const samples = Array.isArray(res.data) ? res.data : [];

    for (const s of samples) {
      await prisma.trend.create({
        data: {
          bantId,
          hiz: Number(s.hiz || s.speed || 0),
          miktar: Number(s.miktar || s.quantity || 0),
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
    
    const oeeVal = res.data?.oee || res.data?.value || 0;
    
    // OEE geldiğinde Trend tablosuna atalım
    await prisma.trend.create({
      data: {
        bantId,
        oee: Number(oeeVal),
      }
    });

    return { oee: oeeVal };
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
    const res = await api.get("/export.csv", { responseType: 'stream' });
    return res.data;
  } catch (err: any) {
    console.error(`❌ CSV çekilemedi:`, err.message);
    return null;
  }
}
