import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const bantlar = await prisma.bant.findMany();
  for (const bant of bantlar) {
    if (bant.isim.includes(' – Hat')) {
      const yeniIsim = bant.isim.split(' – Hat')[0]; // "Bant 1"
      await prisma.bant.update({
        where: { id: bant.id },
        data: { isim: yeniIsim }
      });
    }
  }
  console.log('Bant isimleri güncellendi (Sadece Bant 1, Bant 2 vb. kaldı).');
}
run();
