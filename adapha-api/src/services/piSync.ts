import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";

const prisma = new PrismaClient();

// Aktif bağlantıları ve reconnect deneme sayılarını takip etmek için
const connections = new Map<string, WebSocket>();
const reconnectAttempts = new Map<string, number>();

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

  const url = `ws://${piIp}:8000/live`;
  console.log(`🔌 [Bant ${bantId}] Makineye bağlanılıyor: ${url}`);

  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log(`✅ [Bant ${bantId}] Raspberry Pi'ye başarıyla bağlandı!`);
    connections.set(bantId, ws);
    reconnectAttempts.set(bantId, 0); // Başarılı bağlantıda sıfırla
  });

  ws.on("message", async (data) => {
    try {
      const payload = JSON.parse(data.toString());
      
      // API-MOBIL.md şeması
      // kind: "update", status: "CALISIYOR", total, good, rate, speed
      if (payload.kind !== "update") return;

      const guncellenecekVeri: any = {
        sonGuncelleme: new Date(),
        durum: payload.status || "BILINMIYOR"
      };

      if (payload.speed !== undefined) guncellenecekVeri.anlikHiz = Number(payload.speed);
      if (payload.total !== undefined) guncellenecekVeri.toplamUretim = Number(payload.total);
      if (payload.good !== undefined) guncellenecekVeri.iyiUretim = Number(payload.good);
      if (payload.rate !== undefined) guncellenecekVeri.sertifikaOrani = Number(payload.rate);
      
      // status alanını özel tutalım, mevcut modelde "durum" var ama 
      // "mevcutModel" alanına şimdilik makine id'sini yazabiliriz veya boş bırakabiliriz
      if (payload.machine_id) guncellenecekVeri.mevcutModel = String(payload.machine_id);

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
    connections.delete(bantId);
    
    let attempts = reconnectAttempts.get(bantId) || 0;
    // Üstel geri çekilme (1, 2, 4, 8, 16, 30 max)
    let delay = Math.pow(2, attempts) * 1000;
    if (delay > 30000) delay = 30000;
    
    console.log(`❌ [Bant ${bantId}] Bağlantı koptu. ${delay / 1000} saniye sonra tekrar denenecek...`);
    
    reconnectAttempts.set(bantId, attempts + 1);
    setTimeout(() => baglanMakineye(bantId, piIp, io), delay);
  });

  ws.on("error", (err) => {
    console.error(`⚠️ [Bant ${bantId}] WebSocket Hatası:`, err.message);
    ws.close(); // tetiklenince on("close") çalışıp reconnect yapacak
  });
}
