import WebSocket from "ws";
import { prisma } from "../lib/prisma";
import { Server } from "socket.io";

// Aktif bağlantıları ve reconnect deneme sayılarını takip etmek için
const connections = new Map<string, WebSocket>();
const reconnectAttempts = new Map<string, number>();
const reconnectTimeouts = new Map<string, NodeJS.Timeout>();

export function reconnectMakine(bantId: string, yeniIp: string, yeniPort: number, io: Server) {
  if (reconnectTimeouts.has(bantId)) {
    clearTimeout(reconnectTimeouts.get(bantId)!);
    reconnectTimeouts.delete(bantId);
  }
  if (connections.has(bantId)) {
    const ws = connections.get(bantId);
    ws?.removeAllListeners("close");
    ws?.close();
    connections.delete(bantId);
  }
  reconnectAttempts.set(bantId, 0);
  baglanMakineye(bantId, yeniIp, yeniPort, io);
}

/**
 * Veritabanında kayıtlı olan ve piIpAdresi bulunan bantlar için
 * WebSocket bağlantılarını başlatır.
 */
export async function baslatPiSync(io: Server) {
  try {
    const bantlar = await prisma.bant.findMany({
      where: {
        merkezSunucuIp: { not: null }
      }
    });

    console.log(`📡 Pi Sync: ${bantlar.length} makine için bağlantı aranıyor...`);

    for (const bant of bantlar) {
      if (bant.merkezSunucuIp) {
        baglanMakineye(bant.id, bant.merkezSunucuIp, bant.merkezPort || 8000, io);
      }
    }
    
    // Her 15 dakikada bir geçmişe dönük snapshot kaydet (900.000 ms)
    setInterval(takeTrendSnapshot, 15 * 60 * 1000);
    // Test amaçlı sistemi başlatırken 5 saniye sonra ilk snapshot'ı atalım
    setTimeout(takeTrendSnapshot, 5000);

  } catch (err) {
    console.error("📡 Pi Sync başlatılırken hata:", err);
  }
}

async function takeTrendSnapshot() {
  try {
    const aktifBantlar = await prisma.bant.findMany({ where: { durum: 'acik' } });
    if (aktifBantlar.length === 0) return;

    for (const b of aktifBantlar) {
      await prisma.trend.create({
        data: {
          bantId: b.id,
          hiz: b.anlikHiz,
          miktar: b.toplamUretim,
          kaliteOrani: b.qualityOrani,
          oee: b.oee
        }
      });
    }
    console.log(`📊 [Trend] ${aktifBantlar.length} aktif makine için geçmiş veri (snapshot) kaydedildi.`);
  } catch(e) {
    console.error("Trend snapshot alınırken hata:", e);
  }
}

function baglanMakineye(bantId: string, piIp: string, piPort: number, io: Server) {
  // Eğer zaten bağlıysa tekrar bağlanma
  if (connections.has(bantId)) return;

  const url = `ws://${piIp}:${piPort}/live`;
  console.log(`🔌 [Bant ${bantId}] Makineye bağlanılıyor: ${url}`);

  const ws = new WebSocket(url);

  ws.on("open", async () => {
    console.log(`✅ [Bant ${bantId}] Raspberry Pi'ye başarıyla bağlandı!`);
    connections.set(bantId, ws);
    reconnectAttempts.set(bantId, 0); // Başarılı bağlantıda sıfırla
    
    // Sistem bildirimi
    try {
      const mesaj = `✅ ${bantId} cihazına başarıyla bağlandı.`;
      const yeniBildirim = await prisma.bildirim.create({
        data: { hatId: bantId, tip: 'bilgi', mesaj }
      });
      io.emit("sistem_bildirimi", { id: yeniBildirim.id, bantId, tip: 'baglandi', mesaj, tarih: yeniBildirim.createdAt });
    } catch(e) {}
  });

  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString());
      
      // API-MOBIL.md şeması
      // kind: "update", status: "CALISIYOR", total, good, rate, speed
      if (payload.kind !== "update") return;
      if (payload.machine_id !== bantId) return;

      const guncellenecekVeri: any = {
        sonGuncelleme: new Date(),
        durum: payload.status || "BILINMIYOR"
      };

      if (payload.speed !== undefined) guncellenecekVeri.anlikHiz = Number(payload.speed);
      if (payload.total !== undefined) guncellenecekVeri.toplamUretim = Number(payload.total);
      if (payload.good !== undefined) guncellenecekVeri.iyiUretim = Number(payload.good);
      if (payload.rate !== undefined) guncellenecekVeri.sertifikaOrani = Number(payload.rate);
      
      // B1 Eklemeleri
      if (payload.model !== undefined) guncellenecekVeri.mevcutModel = String(payload.model);
      if (payload.runtime !== undefined) guncellenecekVeri.calismaSuresi = Number(payload.runtime);
      if (payload.oee) {
        const o = payload.oee;
        if (o.oee != null)          guncellenecekVeri.oee = Number(o.oee) * 100;
        if (o.availability != null)  guncellenecekVeri.availability = Number(o.availability) * 100;
        if (o.quality != null)       guncellenecekVeri.qualityOrani = Number(o.quality) * 100;
        if (o.downtime_s != null)    guncellenecekVeri.duruşSuresiSn = Number(o.downtime_s);
      }
      
      switch (payload.status) {
        case "CALISIYOR":
          guncellenecekVeri.durum = "acik";
          guncellenecekVeri.baglantiDurumu = "ONLINE";
          break;
        case "DURDU":
          guncellenecekVeri.durum = "kapali";
          guncellenecekVeri.baglantiDurumu = "ONLINE";
          break;
        case "SINYAL_YOK":
        case "BILINMIYOR":
          guncellenecekVeri.baglantiDurumu = payload.status;
          break;
      }

      // Veritabanını güncelle
      const guncelBant = await prisma.bant.update({
        where: { id: bantId },
        data: guncellenecekVeri
      });

      // Mobil uygulamalara canlı olarak fırlat
      io.emit("bant_guncellendi", guncelBant);
      
    } catch (err) {
      console.warn(`⚠️ [Bant ${bantId}] Gelen veri işlenemedi veya parse edilemedi.`);
    }
  });

  ws.on("close", async () => {
    connections.delete(bantId);
    
    // Bildirim at
    try {
      const mesaj = `⚠️ ${bantId} cihazı ile bağlantı koptu!`;
      const yeniBildirim = await prisma.bildirim.create({
        data: { hatId: bantId, tip: 'hata', mesaj }
      });
      io.emit("sistem_bildirimi", { id: yeniBildirim.id, bantId, tip: 'koptu', mesaj, tarih: yeniBildirim.createdAt });
    } catch (e) {}
    
    let attempts = reconnectAttempts.get(bantId) || 0;
    // Üstel geri çekilme (1, 2, 4, 8, 16, 30 max)
    let delay = Math.pow(2, attempts) * 1000;
    if (delay > 30000) delay = 30000;
    
    console.log(`❌ [Bant ${bantId}] Bağlantı koptu. ${delay / 1000} saniye sonra tekrar denenecek...`);
    
    reconnectAttempts.set(bantId, attempts + 1);
    const timeoutId = setTimeout(() => baglanMakineye(bantId, piIp, piPort, io), delay);
    reconnectTimeouts.set(bantId, timeoutId);
  });

  ws.on("error", (err) => {
    console.error(`⚠️ [Bant ${bantId}] WebSocket Hatası:`, err.message);
    ws.close(); // tetiklenince on("close") çalışıp reconnect yapacak
  });
}
