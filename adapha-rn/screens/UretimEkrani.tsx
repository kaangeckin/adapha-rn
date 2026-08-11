import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Plus, ChevronRight, Settings2, Download, CheckCircle, X } from "lucide-react-native";
import { C } from "../constants/colors";
import { Card, SH } from "../components/Card";
import ModalBottomSheet from "../components/ModalBottomSheet";
import { hizProfili, bantVerisiniCek, socket, Bant, getPiEvents, getPiSamples } from "../services/api";

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

  const aktifToplamUretim = canliBantlar.reduce((sum, b) => sum + (b.toplamUretim || 0), 0);
  const aktifIyiUretim = canliBantlar.reduce((sum, b) => sum + (b.iyiUretim || 0), 0);
  const aktifHatali = aktifToplamUretim - aktifIyiUretim;
  
  const rawGecti = aktifToplamUretim > 0 ? (aktifIyiUretim / aktifToplamUretim) * 100 : 98.36;
  const rawRed = aktifToplamUretim > 0 ? (Math.max(0, aktifHatali) / aktifToplamUretim) * 100 : 0.64;
  
  const gectiPct = Math.min(100, Math.max(0, rawGecti));
  const redPct = Math.min(100 - gectiPct, Math.max(0, rawRed));
  const uyariPct = Math.max(0, 100 - gectiPct - redPct);

  const aktifPartiSayisi = canliBantlar.length;

  const lineData1 = piTrendler.length > 0 ? piTrendler.map(t => ({ value: t.hiz })) : hizProfili.map(d => ({ value: d.hiz }));
  const lineData2 = piTrendler.length > 0 ? piTrendler.map(t => ({ value: t.miktar })) : hizProfili.map(d => ({ value: d.miktar }));

  const kaliteDagilim = [
    { label: "Geçti",      val: `%${gectiPct.toFixed(2)}`, pct: gectiPct, color: C.mint  },
    { label: "Uyarı",      val: `%${Math.max(0, uyariPct).toFixed(2)}`,   pct: Math.max(0, uyariPct),   color: C.sand  },
    { label: "Reddedildi", val: `%${redPct.toFixed(2)}`,  pct: redPct,  color: C.peach },
  ];

  const filtreliPartiler = aktifFiltre === "Tümü"
    ? piOlaylar
    : piOlaylar.filter(p => p.tip === aktifFiltre);

  // Rapor İndir simülasyonu
  const raporIndir = () => {
    setRaporYukleniyor(true);
    setRaporBasarili(false);
    setTimeout(() => {
      setRaporYukleniyor(false);
      setRaporBasarili(true);
      setTimeout(() => setRaporBasarili(false), 3000);
    }, 2000);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Başlık */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Text style={s.dateText}>6 Ağustos 2026</Text>
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
          <Text style={s.statNum}>{aktifPartiSayisi > 0 ? aktifPartiSayisi : 37}</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.mintLt }]}>
          <View style={s.statTopRow}>
            <Text style={s.statLabel}>Toplam Birim</Text>
            <View style={[s.miniTag, { backgroundColor: C.mint }]}>
              <Text style={s.miniTagText}>+%1,2</Text>
            </View>
          </View>
          <Text style={s.statNum}>{aktifToplamUretim > 0 ? aktifToplamUretim.toLocaleString("tr-TR") : "43.624"}</Text>
        </View>
      </View>

      {/* Hız & Kalite Profili */}
      <Card>
        <SH title="Hız & Kalite Profili" action="Rapor İndir" onAction={raporIndir} />
        {raporYukleniyor && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, backgroundColor: C.blueLt, padding: 10, borderRadius: 12 }}>
            <ActivityIndicator size="small" color={C.blue} />
            <Text style={{ fontSize: 11, color: C.blue }}>Rapor hazırlanıyor...</Text>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, height: 2, backgroundColor: C.peach, borderRadius: 1 }} />
            <Text style={{ fontSize: 9, color: C.muted }}>Hız (b/dak)</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, height: 2, backgroundColor: C.mint, borderRadius: 1 }} />
            <Text style={{ fontSize: 9, color: C.muted }}>Kalite Çıktısı</Text>
          </View>
        </View>
        <LineChart
          data={lineData1}
          data2={lineData2}
          width={W - 80}
          height={120}
          color1={C.peach}
          color2={C.mint}
          thickness={2}
          hideDataPoints
          rulesColor="transparent"
          xAxisColor="transparent"
          yAxisColor="transparent"
          xAxisLabelTextStyle={{ color: C.muted, fontSize: 8 }}
          yAxisTextStyle={{ color: C.muted, fontSize: 8 }}
          initialSpacing={8}
          endSpacing={8}
        />
        <View style={[s.typeGrid, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, paddingTop: 12 }]}>
          {[
            { label: "Tip-M", pct: "%45", color: C.peach },
            { label: "Tip-A", pct: "%25", color: C.blue  },
            { label: "Tip-B", pct: "%20", color: C.mint  },
            { label: "Tip-C", pct: "%10", color: C.lav   },
          ].map(t => (
            <View key={t.label} style={{ flexDirection: "row", alignItems: "center", gap: 6, width: "48%" }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: t.color }} />
              <Text style={{ fontSize: 10, color: C.muted }}>{t.label}</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: C.text, marginLeft: "auto" }}>{t.pct}</Text>
            </View>
          ))}
        </View>
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
      <View style={[s.manageTile, { backgroundColor: C.mintLt, marginBottom: 12 }]}>
        <View style={[s.manageIcon, { backgroundColor: C.mint }]}>
          <Settings2 size={18} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.text }}>Tüm Çalışmaları Tek Yerden Yönet</Text>
          <Text style={{ fontSize: 10, color: C.muted }}>Mevcut model: Tip-M</Text>
        </View>
        <ChevronRight size={16} color={C.mint} />
      </View>

      {/* Filtreler */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {["Tümü", "Tip-M", "Tip-A", "Tip-B"].map(f => (
          <TouchableOpacity key={f} onPress={() => setAktifFiltre(f)}
            style={[s.chip, { backgroundColor: aktifFiltre === f ? C.peach : C.blueLt }]}>
            <Text style={[s.chipText, { color: aktifFiltre === f ? "white" : C.muted }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Parti kartları */}
      {filtreliPartiler.map((b, i) => {
        // Tarih formatı düzeltmesi
        const tarihFormat = b.tarih ? new Date(b.tarih).toLocaleDateString("tr-TR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Belirsiz";
        
        return (
          <View key={i} style={s.partiCard}>
            <View style={[s.partiTop, { backgroundColor: C.peachLt }]}>
              <Text style={s.partiMeta}>{tarihFormat}</Text>
              <Text style={s.partiMeta}>{b.sure}</Text>
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
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{seciliParti.tarih} · {seciliParti.sure}</Text>
            </View>

            {[
              { label: "Hat",        val: seciliParti.rozet },
              { label: "Ürün Tipi",  val: seciliParti.tip   },
              { label: "Birim",      val: seciliParti.birim  },
              { label: "Verimlilik", val: seciliParti.verim  },
              { label: "Hata",       val: seciliParti.hata   },
              { label: "Durum",      val: seciliParti.durum  },
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
