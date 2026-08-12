# adapha-api — İkinci Tur Düzeltmeler

İlk listedeki maddelerin çoğu tamamlanmış. Bu dosya kalan üç sorun
ve iki hazırlık maddesini içeriyor.

---

## Tamamlananlar (kontrol edildi)

| # | İş | Durum |
|---|---|---|
| A1 | WebSocket `machine_id` filtresi | ✅ |
| A2 | `syncEvents` / `syncSamples` → `upsert` + unique | ✅ |
| A3 | `oee` / `kaliteOrani` ayrımı | ✅ |
| B1 | `model`, `runtime`, `oee` alanlarının okunması | ⚠️ kısmen (bkz. 1) |
| C2 | `sure` alanı `Float?` oldu | ✅ |
| D3 | Simülatör kaldırıldı | ✅ |
| D4 | Tekil `PrismaClient` (`lib/prisma.ts`) | ✅ |

Ayrıca `yeniBildirim.tarih` → `yeniBildirim.createdAt` düzeltmesi yapılmış.
Şemada alan adı `createdAt` olduğu için eskisi çalışma anında hata
verecekti — ilk listede bu madde yoktu, kendin bulmuşsun.

---

## 1. `payload.oee` bir nesne, sayı değil

**Dosya:** `src/services/piSync.ts`, satır ~95

**Mevcut kod:**

```js
if (payload.oee !== undefined) guncellenecekVeri.oee = Number(payload.oee);
```

**Sorun:** Merkezi API'nin yayınında `oee` düz bir sayı değil, bir nesne:

```json
"oee": {
  "availability": 0.929,
  "quality": 0.997,
  "performance": null,
  "planned_s": 6835.8,
  "downtime_s": 486.2,
  "uretim": 8796
}
```

`Number({...})` sonucu **`NaN`** olur. Ayrıca `Bant` modelinde `oee` diye
bir alan yok — Prisma bilinmeyen alan için hata fırlatır ve `catch` bloğu
bunu yutar. Yani **her mesajda sessizce başarısız oluyor**, veritabanı hiç
güncellenmiyor olabilir.

**Düzeltme — şemaya alanları ekle:**

```prisma
model Bant {
  ...
  oee            Float?    // 0-100 arası yüzde
  availability   Float?
  qualityOrani   Float?
  duruşSuresiSn  Float?
}
```

**Kodda:**

```js
if (payload.oee) {
  const o = payload.oee;
  if (o.oee != null)          guncellenecekVeri.oee = Number(o.oee) * 100;
  if (o.availability != null)  guncellenecekVeri.availability = Number(o.availability) * 100;
  if (o.quality != null)       guncellenecekVeri.qualityOrani = Number(o.quality) * 100;
  if (o.downtime_s != null)    guncellenecekVeri.duruşSuresiSn = Number(o.downtime_s);
}
```

**Önemli not:** `oee.oee` ve `oee.performance` şu anda **hep null gelecek.**
Sebep: OEE'nin Performance bileşeni makinenin nominal hızını (adet/saat)
gerektiriyor, bu değer henüz fabrikadan alınmadı. Nominal hız tanımlanana
kadar sadece `availability` ve `quality` dolu gelir.

Bu yüzden arayüzde toplam OEE için "—" veya "hesaplanıyor" göstermek,
`availability` ve `quality`'yi ayrı ayrı göstermek daha doğru olur.

---

## 2. `syncOee` hâlâ `create` kullanıyor

**Dosya:** `src/services/piRestClient.ts`, satır ~101

`syncEvents` ve `syncSamples` `upsert`'e geçmiş ama bu üçüncüsü atlanmış:

```js
await prisma.trend.create({
  data: { bantId, oee: oeeVal }
});
```

Her çağrıda yeni satır ekliyor — A2'de düzelttiğimiz şişme sorununun aynısı,
daha küçük ölçekte. Ayrıca `timestamp` verilmediği için varsayılan `now()`
kullanılıyor; `@@unique([bantId, timestamp])` kısıtı bu yüzden çakışmıyor
ama kayıtlar birikmeye devam ediyor.

**Düzeltme seçenekleri:**

**a)** Madde 1 uygulandıysa bu fonksiyona hiç gerek kalmaz — OEE artık
WebSocket'ten canlı geliyor. `syncOee`'yi sadece REST cevabı döndürecek
şekilde sadeleştirip veritabanı yazmasını kaldırın.

**b)** Geçmiş OEE grafiği istiyorsanız dakikalık yuvarlanmış zaman damgası
kullanın, böylece dakikada en fazla bir kayıt olur:

```js
const ts = new Date(Math.floor(Date.now() / 60000) * 60000);
await prisma.trend.upsert({
  where: { bantId_timestamp: { bantId, timestamp: ts } },
  update: { oee: oeeVal },
  create: { bantId, timestamp: ts, oee: oeeVal },
});
```

---

## 3. `durum` eşlemesi eksik

**Dosya:** `src/services/piSync.ts`, satır ~97

**Mevcut kod:**

```js
if (payload.status === "DURDU") guncellenecekVeri.durum = "kapali";
else if (payload.status === "CALISIYOR") guncellenecekVeri.durum = "acik";
```

**İki sorun var.**

**Eksik durumlar.** Merkezi API dört değer gönderiyor: `CALISIYOR`, `DURDU`,
`SINYAL_YOK`, `BILINMIYOR`. Son ikisi eşlenmemiş, o durumlarda `durum`
alanı ham değeriyle kalıyor (`"SINYAL_YOK"`). Yani iki sözlük karışıklığı
tamamen çözülmemiş.

**Bilgi kaybı.** "Sinyal yok" ile "kapalı" farklı şeyler:

- `kapali` = makine duruyor, sistem çalışıyor, veri geliyor
- `SINYAL_YOK` = cihazdan veri gelmiyor, makinenin durumu **bilinmiyor**

İkisini birleştirmek, arıza durumunda "makine kapalı" gösterilmesine yol
açar. Operatör makinenin durduğunu sanar, halbuki makine çalışıyor olabilir
ve sadece izleme cihazı arızalıdır.

**Düzeltme — iki alan tutun:**

```prisma
model Bant {
  ...
  durum        String  @default("kapali")  // acik | kapali  (üretim durumu)
  baglantiDurumu String? // ONLINE | SINYAL_YOK | BILINMIYOR
}
```

```js
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
    // durum'a DOKUNMA — son bilinen üretim durumu korunsun
    guncellenecekVeri.baglantiDurumu = payload.status;
    break;
}
```

Arayüzde: `baglantiDurumu !== "ONLINE"` ise kartı gri gösterip "bağlantı
yok" rozeti koyun, `durum` değerini soluk gösterin.

---

## 4. Mobilde sunucu adresi hâlâ sabit

**Dosya:** `adapha-rn/services/api.ts`, satır 45-46

```js
const API_URL = "http://192.168.1.187:3000/api";
export const SOCKET_URL = "http://192.168.1.187:3000";
```

Fabrikada sunucu IP'si farklı olacak. Bu haliyle her adres değişikliğinde
APK yeniden derlenip tüm cihazlara dağıtılmalı.

**Asgari çözüm:** `app.json` → `extra` alanından okuyun:

```json
{ "expo": { "extra": { "apiHost": "192.168.1.187", "apiPort": 3000 } } }
```

```js
import Constants from "expo-constants";
const { apiHost, apiPort } = Constants.expoConfig.extra;
const API_URL = `http://${apiHost}:${apiPort}/api`;
```

**İdeal çözüm:** İlk açılışta sunucu adresi soran bir ekran, değeri
`AsyncStorage`'da saklayın. Sahada IT'nin APK derlemesi gerekmez.

---

## 5. Merkezi API portu sabit varsayılıyor

**Dosya:** `src/services/piRestClient.ts`, satır 6 ve `piSync.ts` satır ~53

```js
baseURL: `http://${ip}:8000`
const url = `ws://${piIp}:8000/live`;
```

Test ortamında merkezi API **8100** portunda çalışıyor (8000'i başka bir
uygulama tutuyordu). Port da yapılandırılabilir olmalı — `Bant` modeline
`merkezPort Int? @default(8000)` ekleyip oradan okuyun.

Ayrıca `piIpAdresi` alan adı yanıltıcı: bu alan **Raspberry Pi'nin değil,
merkezi sunucunun** adresini tutuyor. Mimari:

```
Raspberry Pi (:8080) → Merkezi API (:8000/8100) → adapha-api (:3000) → Mobil
```

`adapha-api` Pi'ye doğrudan bağlanmıyor. Sahada kurulum yapan kişi bu alana
Pi'nin IP'sini yazarsa sistem çalışmaz ve sebebi anlaşılmaz. Alan adını
`merkezSunucuIp` yapmak, ya da en azından log mesajlarını düzeltmek gerekiyor
(`"Raspberry Pi'ye başarıyla bağlandı"` → `"Merkezi sunucuya bağlandı"`).

---

## Öncelik sırası

| # | İş | Neden |
|---|---|---|
| 1 | `payload.oee` nesne olarak işlensin | şu an sessizce başarısız oluyor |
| 2 | `durum` / `baglantiDurumu` ayrımı | arıza durumu yanlış gösteriliyor |
| 3 | `syncOee` → `upsert` veya kaldır | veritabanı birikmesi |
| 4 | Mobilde adres yapılandırılabilir olsun | sahaya çıkış şartı |
| 5 | Port yapılandırılabilir + isimlendirme | kurulum hatasını önler |

Maddeler 1 ve 2 kod düzeyinde, hemen yapılabilir. 4 ve 5 sahaya çıkmadan
önce tamamlanmalı.
