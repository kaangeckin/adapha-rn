export type BantDurumu = "acik" | "kapali";

export interface Bant {
  id: string;
  isim: string;
  durum: BantDurumu;
  hiz?: number;
  sonGuncelleme?: string;
  kameraUrl?: string;
}

// ── Simüle API – Gerçek API hazır olduğunda sadece bu fonksiyonu değiştirin
// const res = await fetch("https://api.sizinfirma.com/bantlar");
// return await res.json();
export async function bantVerisiniCek(): Promise<Bant[]> {
  await new Promise(r => setTimeout(r, 80 + Math.random() * 70));

  const kameraUrller: Record<string, string> = {
    B1: "http://192.168.1.101:8080/?action=stream",
    B2: "http://192.168.1.102:8080/?action=stream",
    B3: "http://192.168.1.103:8080/?action=stream",
    B4: "http://192.168.1.104:8080/?action=stream",
    B5: "http://192.168.1.105:8080/?action=stream",
    B6: "http://192.168.1.106:8080/?action=stream",
    B7: "http://192.168.1.107:8080/?action=stream",
    B8: "http://192.168.1.108:8080/?action=stream",
  };

  const simuleVeri: Bant[] = [
    { id: "B1", isim: "Bant 1 – Hat A", durum: "acik",   hiz: 188 + Math.floor(Math.random() * 10) },
    { id: "B2", isim: "Bant 2 – Hat A", durum: "acik",   hiz: 180 + Math.floor(Math.random() * 10) },
    { id: "B3", isim: "Bant 3 – Hat B", durum: Math.random() > 0.3 ? "kapali" : "acik",
                                         hiz: Math.random() > 0.3 ? undefined : 165 },
    { id: "B4", isim: "Bant 4 – Hat B", durum: "acik",   hiz: 168 + Math.floor(Math.random() * 8)  },
    { id: "B5", isim: "Bant 5 – Hat C", durum: "kapali"                                             },
    { id: "B6", isim: "Bant 6 – Hat C", durum: "acik",   hiz: 154 + Math.floor(Math.random() * 12) },
    { id: "B7", isim: "Bant 7 – Hat D", durum: Math.random() > 0.5 ? "kapali" : "acik",
                                         hiz: Math.random() > 0.5 ? undefined : 172 },
    { id: "B8", isim: "Bant 8 – Hat D", durum: "acik",   hiz: 173 + Math.floor(Math.random() * 10) },
  ].map(b => ({
    ...b,
    kameraUrl: kameraUrller[b.id],
    sonGuncelleme: new Date().toLocaleTimeString("tr-TR"),
  }));

  return simuleVeri;
}

// ── Grafik verisi ────────────────────────────────────────────────────────────
export const hizProfili = [
  { t: "0:00", hiz: 0,   miktar: 0   },
  { t: "0:30", hiz: 18,  miktar: 15  },
  { t: "1:00", hiz: 188, miktar: 182 },
  { t: "1:30", hiz: 192, miktar: 188 },
  { t: "2:00", hiz: 196, miktar: 193 },
  { t: "2:30", hiz: 190, miktar: 185 },
  { t: "3:00", hiz: 12,  miktar: 9   },
  { t: "3:30", hiz: 6,   miktar: 4   },
  { t: "4:00", hiz: 148, miktar: 143 },
  { t: "4:30", hiz: 162, miktar: 157 },
  { t: "5:00", hiz: 152, miktar: 148 },
];

export const aylikUretim = [
  { ay: "Oca", cikti: 251, iyi: 248 },
  { ay: "Şub", cikti: 188, iyi: 185 },
  { ay: "Mar", cikti: 220, iyi: 216 },
  { ay: "Nis", cikti: 198, iyi: 194 },
  { ay: "May", cikti: 242, iyi: 238 },
  { ay: "Haz", cikti: 268, iyi: 263 },
  { ay: "Tem", cikti: 284, iyi: 279 },
  { ay: "Ağu", cikti: 310, iyi: 305 },
];

export const partiBuyume = [
  { b: "P1", r: 62 }, { b: "P2", r: 74 }, { b: "P3", r: 68 },
  { b: "P4", r: 82 }, { b: "P5", r: 88 }, { b: "P6", r: 94 },
  { b: "P7", r: 92 }, { b: "P8", r: 98 },
];

export const radarVerisi = [
  { label: "Hız",        value: 72 },
  { label: "Kalite",     value: 98 },
  { label: "Verimlilik", value: 85 },
  { label: "Çalışma",    value: 78 },
  { label: "Hassasiyet", value: 90 },
  { label: "Güvenilir.", value: 88 },
];

export const isiHatlar   = ["Hat 1","Hat 2","Hat 3","Hat 4","Hat 5","Hat 6","Hat 7","Hat 8"];
export const isiSutunlar = ["Hız","Kal","Vrl","Çal","Has","Güv"];
export const isiDegerler = [
  [90,88,82,78,70,65],[95,92,88,85,78,72],[72,68,62,55,45,38],
  [85,82,75,68,60,52],[80,76,70,64,55,48],[88,84,78,72,64,58],
  [70,66,60,52,44,36],[92,89,82,76,68,62],
];

export const performansTablo = [
  { oncelik:"Acil",   hat:"Hat 3", durum:"Hız %40 < 50",   aksiyon:"İncele"  },
  { oncelik:"Yüksek", hat:"Hat 7", durum:"Verimlilik %72", aksiyon:"Kontrol" },
  { oncelik:"Orta",   hat:"Hat 4", durum:"Kalite %40 <90", aksiyon:"İzle"    },
  { oncelik:"Canlı",  hat:"Hat 1", durum:"Sertifika %98",  aksiyon:"Aktif"   },
];

export const programVerisi = [
  { parti:"Sabah", hat:"H1", tip:"Tip-M", saat:"09:00" },
  { parti:"Sabah", hat:"H2", tip:"Tip-M", saat:"09:00" },
  { parti:"Sabah", hat:"H3", tip:"Tip-A", saat:"09:30" },
  { parti:"Öğlen", hat:"H1", tip:"Tip-M", saat:"14:00" },
  { parti:"Öğlen", hat:"H4", tip:"Tip-B", saat:"14:30" },
];
