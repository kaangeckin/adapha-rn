import { io, Socket } from "socket.io-client";

export type BantDurumu = "acik" | "kapali";

export interface Bant {
  id: string;
  isim: string;
  durum: BantDurumu;
  anlikHiz?: number;
  sonGuncelleme?: string;
  kameraUrl?: string;
  hatId?: string;
}

// ── Sunucu IP Adresi (Uygulamanın çalıştığı ağdaki bilgisayarın IP'si) ──
const API_URL = "http://192.168.1.199:3000/api";
export const SOCKET_URL = "http://192.168.1.199:3000";

// Socket bağlantısını oluştur
export const socket: Socket = io(SOCKET_URL);

// ── Gerçek API Bağlantıları ────────────────────────────────────────────────
export async function bantVerisiniCek(): Promise<Bant[]> {
  try {
    const res = await fetch(`${API_URL}/bantlar`);
    if (!res.ok) throw new Error("Bantları çekerken hata oluştu");
    return await res.json();
  } catch (error) {
    console.error("Bant verisi çekilemedi:", error);
    return [];
  }
}

export async function dashboardOzetiniCek() {
  try {
    const res = await fetch(`${API_URL}/dashboard/ozet`);
    if (!res.ok) throw new Error("Dashboard özeti çekerken hata oluştu");
    return await res.json();
  } catch (error) {
    console.error("Dashboard özeti çekilemedi:", error);
    return { aktifHatSayisi: 0, toplamCikti: 0, anlikHizOrta: 0 };
  }
}

// ── Grafik verisi ────────────────────────────────────────────────────────────
// NOT: Analiz ekranlarındaki detaylı grafiklerin verileri de API'den gelecek şekilde ayarlandı.
// Aşağıdaki sabit verileri zamanla tamamen API'ye bağlayabilirsiniz. Şu an test için API'den de çekebiliyoruz.

export async function radarVerisiniCek() {
  const res = await fetch(`${API_URL}/analitik/radar`);
  return await res.json();
}

export async function isiHaritasiniCek() {
  const res = await fetch(`${API_URL}/analitik/isi-haritasi`);
  return await res.json();
}

export async function performansTablosunuCek() {
  const res = await fetch(`${API_URL}/analitik/performans-tablosu`);
  return await res.json();
}

// Şimdilik statik kalan analiz verileri (zamanla API'ye eklenebilir):
export const hizProfili = [
  { t: "0:00", hiz: 0, miktar: 0 }, { t: "0:30", hiz: 18, miktar: 15 },
  { t: "1:00", hiz: 188, miktar: 182 }, { t: "1:30", hiz: 192, miktar: 188 },
  { t: "2:00", hiz: 196, miktar: 193 }, { t: "2:30", hiz: 190, miktar: 185 },
  { t: "3:00", hiz: 12, miktar: 9 }, { t: "3:30", hiz: 6, miktar: 4 },
  { t: "4:00", hiz: 148, miktar: 143 }, { t: "4:30", hiz: 162, miktar: 157 },
  { t: "5:00", hiz: 152, miktar: 148 },
];

export const aylikUretim = [
  { ay: "Oca", cikti: 251, iyi: 248 }, { ay: "Şub", cikti: 188, iyi: 185 },
  { ay: "Mar", cikti: 220, iyi: 216 }, { ay: "Nis", cikti: 198, iyi: 194 },
  { ay: "May", cikti: 242, iyi: 238 }, { ay: "Haz", cikti: 268, iyi: 263 },
  { ay: "Tem", cikti: 284, iyi: 279 }, { ay: "Ağu", cikti: 310, iyi: 305 },
];

export const partiBuyume = [
  { b: "P1", r: 62 }, { b: "P2", r: 74 }, { b: "P3", r: 68 },
  { b: "P4", r: 82 }, { b: "P5", r: 88 }, { b: "P6", r: 94 },
  { b: "P7", r: 92 }, { b: "P8", r: 98 },
];

export const programVerisi = [
  { parti: "Sabah", hat: "H1", tip: "Tip-M", saat: "09:00" },
  { parti: "Sabah", hat: "H2", tip: "Tip-M", saat: "09:00" },
  { parti: "Sabah", hat: "H3", tip: "Tip-A", saat: "09:30" },
  { parti: "Öğlen", hat: "H1", tip: "Tip-M", saat: "14:00" },
  { parti: "Öğlen", hat: "H4", tip: "Tip-B", saat: "14:30" },
];
