import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Plus, ChevronRight, Settings2, Download, CheckCircle, X } from "lucide-react-native";
import { C } from "../constants/colors";
import { Card, SH } from "../components/Card";
import ModalBottomSheet from "../components/ModalBottomSheet";
import { hizProfili, bantVerisiniCek, socket, Bant, getPiEvents, getPiSamples, formatTarih } from "../services/api";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const W = Dimensions.get("window").width;

// Pi'den gelecek verilerle doldurulacak, artık sahte liste yok.

export default function UretimEkrani() {
  const [aktifFiltre, setAktifFiltre] = useState("Tümü");
  const [detayModal, setDetayModal] = useState(false);
  const [seciliParti, setSeciliParti] = useState<any>(null);
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);
  const [raporBasarili, setRaporBasarili] = useState(false);

  // Canlı veriler
  const [canliBantlar, setCanliBantlar] = useState<Bant[]>([]);
  const [piOlaylar, setPiOlaylar] = useState<any[]>([]);
  const [piTrendler, setPiTrendler] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const veriCek = async () => {
      const bVeri = await bantVerisiniCek();
      const acikBantlar = bVeri.filter(b => b.durum === "acik");
      setCanliBantlar(acikBantlar);

      // İlk açık bant için olay ve trend geçmişini çekelim (şuanlık B1)
      if (acikBantlar.length > 0) {
        const events = await getPiEvents(acikBantlar[0].id);
        setPiOlaylar(events);

        const samples = await getPiSamples(acikBantlar[0].id);
        setPiTrendler(samples);
      }

      setLoading(false);
    };
    veriCek();

    socket.on("bant_guncellendi", (guncelBant: Bant) => {
      setCanliBantlar(prev => {
        const kopya = [...prev];
        const idx = kopya.findIndex(b => b.id === guncelBant.id);
        if (idx !== -1) {
          kopya[idx] = { ...kopya[idx], ...guncelBant };
        } else if (guncelBant.durum === "acik") {
          kopya.push(guncelBant);
        }
        return kopya;
      });
    });

    return () => {
      socket.off("bant_guncellendi");
    };
  }, []);

  const aktifToplamUretim = (canliBantlar || []).reduce((sum, b) => sum + (b.toplamUretim || 0), 0);
  const aktifIyiUretim = (canliBantlar || []).reduce((sum, b) => sum + (b.iyiUretim || 0), 0);
  const aktifHatali = aktifToplamUretim - aktifIyiUretim;

  const rawGectiPct = aktifToplamUretim > 0 ? (aktifIyiUretim / aktifToplamUretim) * 100 : 0;
  const rawRedPct = aktifToplamUretim > 0 ? (aktifHatali / aktifToplamUretim) * 100 : 0;

  const gectiPct = Math.min(100, Math.max(0, rawGectiPct));
  const redPct = Math.min(100 - gectiPct, Math.max(0, rawRedPct));
  const uyariPct = Math.max(0, 100 - gectiPct - redPct);

  const aktifPartiSayisi = canliBantlar.length;

  const aktifModeller = Array.from(new Set(canliBantlar.map(b => b.mevcutModel).filter(Boolean)));
  const modelFiltreleri = ["Tümü", ...aktifModeller];


  const kaliteDagilim = [
    { label: "Geçti", val: `%${gectiPct.toFixed(2)}`, pct: gectiPct, color: C.mint },
    { label: "Uyarı", val: `%${Math.max(0, uyariPct).toFixed(2)}`, pct: Math.max(0, uyariPct), color: C.sand },
    { label: "Reddedildi", val: `%${redPct.toFixed(2)}`, pct: redPct, color: C.peach },
  ];

  const filtreliPartiler = aktifFiltre === "Tümü"
    ? (piOlaylar || [])
    : (piOlaylar || []).filter(p => p.tip === aktifFiltre);

  const raporIndir = async () => {
    setRaporYukleniyor(true);
    setRaporBasarili(false);
    try {
      const gecti = gectiPct.toFixed(2);
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #2E5DA8; text-align: center; border-bottom: 2px solid #EBF0FA; padding-bottom: 20px; }
              .box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; border-bottom: 1px solid #dee2e6; padding: 10px 0; }
              .label { font-weight: bold; color: #555; }
              .val { color: #000; font-weight: bold; }
              .footer { text-align: center; font-size: 12px; color: #999; margin-top: 40px; }
            </style>
          </head>
          <body>
            <h1>Adapha Üretim Raporu</h1>
            <div class="box">
              <div class="row"><span class="label">Tarih</span> <span class="val">${new Date().toLocaleString("tr-TR")}</span></div>
              <div class="row"><span class="label">Aktif Parti Sayısı</span> <span class="val">${aktifPartiSayisi}</span></div>
              <div class="row"><span class="label">Toplam Üretim</span> <span class="val">${aktifToplamUretim.toLocaleString("tr-TR")}</span></div>
            </div>
            <div class="box">
              <div class="row"><span class="label">Sertifikalı Ürün (%)</span> <span class="val" style="color: #2F9C95;">%${gecti}</span></div>
              <div class="row"><span class="label">Uyarı Seviyesi (%)</span> <span class="val" style="color: #E5B15D;">%${uyariPct.toFixed(2)}</span></div>
              <div class="row"><span class="label">Hatalı / Fire (%)</span> <span class="val" style="color: #E76F51;">%${redPct.toFixed(2)}</span></div>
            </div>
            <div class="footer">
              <p>Bu rapor Adapha AI tarafından otomatik olarak oluşturulmuştur.</p>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Üretim Raporunu İndir' });
      setRaporBasarili(true);
      setTimeout(() => setRaporBasarili(false), 3000);
    } catch (error) {
      console.error("PDF Hatası:", error);
    } finally {
      setRaporYukleniyor(false);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Başlık */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Text style={s.dateText}>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <Text style={s.pageTitle}>Üretim</Text>
          <Text style={s.pageSub}>Yönetimi</Text>
        </View>
      </View>

      {/* Başarı / Bildirim Toastları */}
      {raporBasarili && (
        <View style={s.toast}>
          <CheckCircle size={14} color={C.mint} />
          <Text style={s.toastText}>Rapor başarıyla indirildi!</Text>
        </View>
      )}

      {/* İstatistikler */}
      <View style={s.statRow}>
        <View style={[s.stat, { backgroundColor: C.blueLt }]}>
          <View style={s.statTopRow}>
            <Text style={s.statLabel}>Toplam Parti</Text>
            <View style={[s.miniTag, { backgroundColor: C.blue }]}>
              <Text style={s.miniTagText}>+%3,2</Text>
            </View>
          </View>
          <Text style={s.statNum}>{aktifPartiSayisi}</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.mintLt }]}>
          <View style={s.statTopRow}>
            <Text style={s.statLabel}>Toplam Birim</Text>
            <View style={[s.miniTag, { backgroundColor: C.mint }]}>
              <Text style={s.miniTagText}>+%1,2</Text>
            </View>
          </View>
          <Text style={s.statNum}>{aktifToplamUretim.toLocaleString("tr-TR")}</Text>
        </View>
      </View>

      {/* Aktif Modeller */}
      <Card>
        <SH title="Aktif Modeller" action="Rapor İndir" onAction={raporIndir} />
        {raporYukleniyor && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, backgroundColor: C.blueLt, padding: 10, borderRadius: 12 }}>
            <ActivityIndicator size="small" color={C.blue} />
            <Text style={{ fontSize: 11, color: C.blue }}>Rapor hazırlanıyor...</Text>
          </View>
        )}
        
        {aktifModeller.length > 0 ? (
          <View style={[s.typeGrid, { marginTop: 4 }]}>
            {aktifModeller.map((mod, index) => (
              <View key={String(mod)} style={{ flexDirection: "row", alignItems: "center", gap: 6, width: "48%", marginBottom: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: [C.peach, C.blue, C.mint, C.lav][index % 4] }} />
                <Text style={{ fontSize: 10, color: C.muted }}>Model: {mod}</Text>
                <Text style={{ fontSize: 10, fontWeight: "700", color: C.text, marginLeft: "auto" }}>Aktif</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 11, color: C.muted, paddingVertical: 12, textAlign: "center" }}>Şu an aktif bir üretim modeli bulunmuyor.</Text>
        )}
      </Card>

      {/* Kalite Dağılımı */}
      <Card>
        <SH title="Kalite Dağılımı" />
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 16 }}>
          {kaliteDagilim.map(q => (
            <View key={q.label} style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: q.color }}>{q.val}</Text>
              <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{q.label}</Text>
            </View>
          ))}
        </View>
        {kaliteDagilim.map(q => (
          <View key={q.label} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{q.label}</Text>
            <View style={{ height: 8, borderRadius: 99, backgroundColor: "#D8E6F0", overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${Math.max(q.pct, 0.4)}%`, backgroundColor: q.color, borderRadius: 99 }} />
            </View>
          </View>
        ))}
      </Card>

      {/* Yönet kutucuğu */}
      <View style={[s.manageTile, { backgroundColor: C.mintLt }]}>
        <View style={[s.manageIcon, { backgroundColor: C.mint }]}>
          <Settings2 size={18} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.text }}>Tüm Çalışmaları Tek Yerden Yönet</Text>
          <Text style={{ fontSize: 10, color: C.muted }}>Mevcut model(ler): {aktifModeller.length > 0 ? aktifModeller.join(", ") : "Bekleniyor..."}</Text>
        </View>
        <ChevronRight size={16} color={C.mint} />
      </View>



      {/* Filtreler */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {modelFiltreleri.map(f => (
          <TouchableOpacity key={String(f)} onPress={() => setAktifFiltre(String(f))}
            style={[s.chip, { backgroundColor: aktifFiltre === String(f) ? C.peach : C.blueLt }]}>
            <Text style={[s.chipText, { color: aktifFiltre === String(f) ? "white" : C.muted }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Parti kartları */}
      {(filtreliPartiler || []).map((b, i) => {
        // Tarih formatı düzeltmesi (C5)
        const tarihFormat = formatTarih(b.tarih);

        return (
          <View key={i} style={s.partiCard}>
            <View style={[s.partiTop, { backgroundColor: C.peachLt }]}>
              <Text style={s.partiMeta}>{tarihFormat}</Text>
              <Text style={s.partiMeta}>{typeof b.sure === "number" ? `${b.sure.toFixed(1)} sn` : (b.sure || "Belirsiz")}</Text>
              <Text style={s.partiMeta}>{b.birim}</Text>
            </View>
            <View style={s.partiBottom}>
              <View>
                <Text style={s.partiTitle}>{b.baslik}</Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                  <View style={[s.partiTag, { backgroundColor: C.blueLt }]}>
                    <Text style={[s.partiTagText, { color: C.blue }]}>{b.bantId || "Hat-01"}</Text>
                  </View>
                  <View style={[s.partiTag, { backgroundColor: b.durum === "Tamamlandı" ? C.mintLt : C.peachLt }]}>
                    <Text style={[s.partiTagText, { color: b.durum === "Tamamlandı" ? C.mint : C.peach }]}>{b.durum}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[s.detayBtn, { backgroundColor: C.peach }]}
                onPress={() => { setSeciliParti(b); setDetayModal(true); }}
              >
                <Text style={s.detayBtnText}>Detay</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {filtreliPartiler.length === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ fontSize: 13, color: C.muted }}>Bu tipte parti bulunamadı.</Text>
        </View>
      )}

      {/* ───── MODALLAR ───── */}



      {/* Parti Detay Modalı */}
      <ModalBottomSheet
        visible={detayModal}
        onClose={() => setDetayModal(false)}
        title="Parti Detayları"
      >
        {seciliParti && (
          <View style={{ gap: 12, paddingBottom: 8 }}>
            <View style={[s.infoBox, { backgroundColor: C.peachLt }]}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: C.text }}>{seciliParti.baslik}</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{formatTarih(seciliParti.tarih)} · {typeof seciliParti.sure === "number" ? `${seciliParti.sure.toFixed(1)} sn` : (seciliParti.sure || "Belirsiz")}</Text>
            </View>

            {[
              { label: "Hat", val: seciliParti.rozet },
              { label: "Ürün Tipi", val: seciliParti.tip },
              { label: "Birim", val: seciliParti.birim },
              { label: "Verimlilik", val: seciliParti.verim },
              { label: "Hata", val: seciliParti.hata },
              { label: "Durum", val: seciliParti.durum },
            ].map(r => (
              <View key={r.label} style={s.detailRow}>
                <Text style={s.detailLabel}>{r.label}</Text>
                <Text style={s.detailVal}>{r.val}</Text>
              </View>
            ))}

            <View style={[s.infoBox, { backgroundColor: seciliParti.durum === "Tamamlandı" ? C.mintLt : C.peachLt }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: seciliParti.durum === "Tamamlandı" ? C.mint : C.peach }}>
                {seciliParti.durum === "Tamamlandı" ? "✓ Bu parti başarıyla tamamlandı." : "⏳ Bu parti hâlâ devam ediyor."}
              </Text>
            </View>
          </View>
        )}
      </ModalBottomSheet>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  dateText: { fontSize: 11, color: C.muted },
  pageTitle: { fontSize: 21, fontWeight: "800", color: C.text, lineHeight: 26 },
  pageSub: { fontSize: 13, color: C.muted },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.peach, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  addBtnText: { color: "white", fontSize: 11, fontWeight: "700" },
  statRow: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  statTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 10, color: C.muted },
  statNum: { fontSize: 26, fontWeight: "800", color: C.text },
  miniTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99 },
  miniTagText: { fontSize: 8, fontWeight: "700", color: "white" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  manageTile: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  manageIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.peach, paddingVertical: 12, borderRadius: 16 },
  primaryBtnText: { color: "white", fontSize: 13, fontWeight: "700" },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginRight: 8 },
  chipText: { fontSize: 10, fontWeight: "600" },
  partiCard: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  partiTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  partiMeta: { fontSize: 9.5, color: C.muted },
  partiBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "white" },
  partiTitle: { fontSize: 12.5, fontWeight: "600", color: C.text },
  partiTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  partiTagText: { fontSize: 9, fontWeight: "600" },
  detayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  detayBtnText: { color: "white", fontSize: 11, fontWeight: "700" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.mintLt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.mint },
  toastText: { fontSize: 12, fontWeight: "600", color: C.mint },
  formLabel: { fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 10 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: "white" },
  optionChipText: { fontSize: 12, fontWeight: "600", color: C.muted },
  infoBox: { borderRadius: 12, padding: 14 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  detailLabel: { fontSize: 12, color: C.muted },
  detailVal: { fontSize: 12, fontWeight: "700", color: C.text },
});

