import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Veritabanı temizleniyor...');
  await prisma.olay.deleteMany();
  await prisma.trend.deleteMany();
  await prisma.bildirim.deleteMany();
  await prisma.performansMetrigi.deleteMany();
  await prisma.kaliteKontrol.deleteMany();
  await prisma.uretimKaydi.deleteMany();
  await prisma.uretimPartisi.deleteMany();
  await prisma.bant.deleteMany();
  await prisma.hat.deleteMany();

  console.log('Hatlar oluşturuluyor...');
  const hatlar = [
    { id: 'H1', isim: 'Hat 1 – A Blok', durum: 'aktif' },
    { id: 'H2', isim: 'Hat 2 – A Blok', durum: 'aktif' },
    { id: 'H3', isim: 'Hat 3 – B Blok', durum: 'pasif' },
    { id: 'H4', isim: 'Hat 4 – B Blok', durum: 'pasif' },
    { id: 'H5', isim: 'Hat 5 – C Blok', durum: 'bakim' },
    { id: 'H6', isim: 'Hat 6 – C Blok', durum: 'pasif' },
    { id: 'H7', isim: 'Hat 7 – D Blok', durum: 'pasif' },
    { id: 'H8', isim: 'Hat 8 – D Blok', durum: 'pasif' },
  ];

  for (const hat of hatlar) {
    await prisma.hat.create({ data: hat });
  }

  console.log('Bantlar oluşturuluyor...');
  for (let i = 1; i <= 8; i++) {
    await prisma.bant.create({
      data: {
        id: `MAK-0${i}`,
        hatId: `H${i}`,
        isim: `Bant ${i} – Hat ${['A','A','B','B','C','C','D','D'][i-1]}`,
        durum: i <= 2 ? 'acik' : 'kapali',
        anlikHiz: i <= 2 ? 45.2 : 0,
        kameraUrl: `http://192.168.1.106:8080/?action=stream`, // Raspberry Pi kamera adresi simülasyonu
      },
    });
  }

  console.log('Örnek Üretim Partisi ve Kayıtlar ekleniyor...');
  const parti1 = await prisma.uretimPartisi.create({
    data: {
      hatId: 'H1',
      tip: 'Tip-M (Yetişkin Bezi)',
      partiAdi: 'Sabah Vardiyası',
      baslangic: new Date(new Date().setHours(8, 0, 0, 0)),
      hedefBirim: 10000,
      gercekBirim: 4500,
      durum: 'devam',
    }
  });

  await prisma.kaliteKontrol.create({
    data: {
      partiId: parti1.id,
      toplamBirim: 4500,
      iyiBirim: 4420,
      uyariBirim: 50,
      redBirim: 30,
      sertifikaOrani: 98.2,
    }
  });

  await prisma.bildirim.create({
    data: {
      hatId: 'H1',
      tip: 'bilgi',
      mesaj: 'Üretim hedefine %45 oranında ulaşıldı.',
    }
  });

  console.log('✅ Seed işlemi başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
