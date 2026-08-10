import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Test olayları ve trend verileri ekleniyor...");
  
  // Bant 1 (H1) için veriler ekleyelim
  const bantId = "B1";

  // Olaylar (Events)
  await prisma.olay.createMany({
    data: [
      { bantId, sure: "3 saat", birim: "Birim: 100", baslik: "Sabah Üretim Çalışması", durum: "Tamamlandı", tip: "Tip-M", verim: "%98.4", hata: "2 birim" },
      { bantId, sure: "1 saat", birim: "Birim: 40", baslik: "Öğle Sonrası Özel", durum: "Devam Ediyor", tip: "Tip-A", verim: "%96.1", hata: "4 birim" }
    ]
  });

  // Trend (Samples)
  await prisma.trend.createMany({
    data: [
      { bantId, hiz: 140, miktar: 1000, oee: 92.4 },
      { bantId, hiz: 145, miktar: 2050, oee: 93.1 },
      { bantId, hiz: 152, miktar: 3200, oee: 94.5 },
      { bantId, hiz: 148, miktar: 4300, oee: 94.0 },
    ]
  });

  console.log("Veriler başarıyla eklendi!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
