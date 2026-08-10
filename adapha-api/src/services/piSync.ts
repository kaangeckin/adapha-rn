import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const prisma = new PrismaClient();

// Aktif bağlantıları takip etmek için
const connections = new Map<string, WebSocket>();

/**
 * Veritabanında kayıtlı olan ve piIpAdresi bulunan bantlar için
 * WebSocket bağlantılarını başlatır.
 */
export async function baslatPiSync(io: Server) {
  try {
    const bantlar = await prisma.bant.findMany({
      where: {
        piIpAdresi: { not: null }
      }
    });

    console.log(`📡 Pi Sync: ${bantlar.length} makine için bağlantı aranıyor...`);

    for (const bant of bantlar) {
      if (bant.piIpAdresi) {
        baglanMakineye(bant.id, bant.piIpAdresi, io);
      }
    }
  } catch (err) {
    console.error("📡 Pi Sync başlatılırken hata:", err);
  }
}

function baglanMakineye(bantId: string, piIp: string, io: Server) {
  // Eğer zaten bağlıysa tekrar bağlanma
  if (connections.has(bantId)) return;

  const url = `ws://${piIp}/live`;
  console.log(`🔌 [Bant ${bantId}] Makineye bağlanılıyor: ${url}`);

  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log(`✅ [Bant ${bantId}] Raspberry Pi'ye başarıyla bağlandı!`);
    connections.set(bantId, ws);
  });

  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString());
      
      // Fotoğraftaki verilere dayanarak mapping işlemi:
      // Burada payload'dan gelen gerçek alan adlarını eşleştiriyoruz.
      // Not: Pi'deki alan adları farklıysa (örn: payload.CurrentModel) buradan güncelleyeceğiz.
      const guncellenecekVeri: any = {
        sonGuncelleme: new Date(),
        durum: "acik" // Veri geldiğine göre açıktır
      };

      if (payload.anlikHiz !== undefined || payload.speed !== undefined) guncellenecekVeri.anlikHiz = payload.anlikHiz || payload.speed;
      if (payload.mevcutModel || payload.type) guncellenecekVeri.mevcutModel = String(payload.mevcutModel || payload.type);
      if (payload.toplamUretim || payload.totalQuantity) guncellenecekVeri.toplamUretim = Number(payload.toplamUretim || payload.totalQuantity);
      if (payload.iyiUretim || payload.goodProducts) guncellenecekVeri.iyiUretim = Number(payload.iyiUretim || payload.goodProducts);
      if (payload.sertifikaOrani || payload.rate) guncellenecekVeri.sertifikaOrani = Number(payload.sertifikaOrani || payload.rate);
      if (payload.calismaSuresi || payload.runningTime) guncellenecekVeri.calismaSuresi = Number(payload.calismaSuresi || payload.runningTime);

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

  ws.on("close", () => {
    console.log(`❌ [Bant ${bantId}] Bağlantı koptu. 5 saniye sonra tekrar denenecek...`);
    connections.delete(bantId);
    setTimeout(() => baglanMakineye(bantId, piIp, io), 5000);
  });

  ws.on("error", (err) => {
    console.error(`⚠️ [Bant ${bantId}] WebSocket Hatası:`, err.message);
    ws.close(); // tetiklenince on("close") çalışıp reconnect yapacak
  });
}
