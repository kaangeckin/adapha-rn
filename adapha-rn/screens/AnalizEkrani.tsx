import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Download, ChevronRight, Zap, Award, Calendar, CheckCircle } from "lucide-react-native";
import { C } from "../constants/colors";
import { Card, SH } from "../components/Card";
import ModalBottomSheet from "../components/ModalBottomSheet";
import { partiBuyume, radarVerisiniCek, performansTablosunuCek, isiHaritasiniCek, bantVerisiniCek, socket, Bant, getPiSamples, getPiOee } from "../services/api";

const W = Dimensions.get("window").width;

// Basit SVG Radar – react-native-svg
import Svg, { Polygon, Line, Text as SvgText, Circle } from "react-native-svg";
function RadarGraf({ data }: { data: any[] }) {
  const cx = 110, cy = 100, r = 70;
  if (!data || data.length === 0) return null;
  const n = data.length;
  const toXY = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };
  const labelXY = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + (r + 18) * Math.cos(angle), y: cy + (r + 18) * Math.sin(angle) };
  };
  const gridLevels = [25, 50, 75, 100];
  const points = data.map((d, i) => toXY(i, d.value));
  const pointStr = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={W - 80} height={200} viewBox="0 0 220 200">
      {/* Izgara */}
      {gridLevels.map(lv => {
        const gPts = data.map((_, i) => toXY(i, lv));
        const gStr = gPts.map(p => `${p.x},${p.y}`).join(" ");
        return <Polygon key={lv} points={gStr} fill="none" stroke={C.border} strokeWidth="1" />;
      })}
      {/* Eksenler */}
      {data.map((_, i) => {
        const ep = toXY(i, 100);
        return <Line key={i} x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke={C.border} strokeWidth="1" />;
      })}
      {/* Veri */}
      <Polygon points={pointStr} fill={`${C.peach}30`} stroke={C.peach} strokeWidth="2" />
      {/* Etiketler */}
      {data.map((d, i) => {
        const lp = labelXY(i);
        return <SvgText key={i} x={lp.x} y={lp.y} textAnchor="middle" alignmentBaseline="middle" fontSize="9" fill={C.muted}>{d.label}</SvgText>;
      })}
    </Svg>
  );
}

// Isı haritası rengi
function isiRengi(v: number): string {
  const ops = ["1A", "30", "50", "80", "B0", "E0"];
  const i = v >= 90 ? 5 : v >= 80 ? 4 : v >= 70 ? 3 : v >= 60 ? 2 : v >= 50 ? 1 : 0;
  return `${C.peach}${ops[i]}`;
}

export default function AnalizEkrani() {
  const [loading, setLoading] = useState(true);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [performansData, setPerformansData] = useState<any[]>([]);
  const [isiData, setIsiData] = useState<{ hatlar: string[], sutunlar: string[], degerler: number[][] }>({ hatlar: [], sutunlar: [], degerler: [] });
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);
  const [raporBasarili, setRaporBasarili] = useState(false);
  const [detayModal, setDetayModal] = useState(false);
  const [canliBantlar, setCanliBantlar] = useState<Bant[]>([]);
  const [piTrendler, setPiTrendler] = useState<any[]>([]);
  const [piOee, setPiOee] = useState<number>(0);

  useEffect(() => {
    const veriCek = async () => {
      try {
        const [rData, pData, iData, bVeri] = await Promise.all([
          radarVerisiniCek(),
          performansTablosunuCek(),
          isiHaritasiniCek(),
          bantVerisiniCek()
        ]);
        setRadarData(rData || []);
        setPerformansData(pData || []);
        setIsiData(iData || { hatlar: [], sutunlar: [], degerler: [] });
        
        const acikBantlar = bVeri.filter(b => b.durum === "acik");
        setCanliBantlar(acikBantlar);

        if (acikBantlar.length > 0) {
          const samples = await getPiSamples(acikBantlar[0].id);
          setPiTrendler(samples);

          const oeeData = await getPiOee(acikBantlar[0].id);
          if (oeeData?.oee) setPiOee(oeeData.oee);
        }
      } catch (err) {
        console.error("Analiz verileri alınamadı:", err);
      } finally {
        setLoading(false);
      }
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

  const raporIndir = () => {
    setRaporYukleniyor(true);
    setRaporBasarili(false);
    setTimeout(() => {
      setRaporYukleniyor(false);
      setRaporBasarili(true);
      setTimeout(() => setRaporBasarili(false), 3000);
    }, 2000);
  };


  const buyumeData = piTrendler.length > 0 ? piTrendler.map(t => ({ value: t.oee || 50 })) : partiBuyume.map(d => ({ value: d.r }));

  // CANLI VERİLERDEN HESAPLAMALAR
  const aktifToplamUretim = canliBantlar.reduce((sum, b) => sum + (b.toplamUretim || 0), 0);
  const aktifIyiUretim = canliBantlar.reduce((sum, b) => sum + (b.iyiUretim || 0), 0);
  const aktifHatali = Math.max(0, aktifToplamUretim - aktifIyiUretim);
  
  const rawGecti = piOee > 0 ? piOee : (aktifToplamUretim > 0 ? (aktifIyiUretim / aktifToplamUretim) * 100 : 98.36);
  const rawRed = aktifToplamUretim > 0 ? (aktifHatali / aktifToplamUretim) * 100 : 0.64;
  
  const gectiPct = Math.min(100, Math.max(0, rawGecti));
  const redPct = Math.min(100 - gectiPct, Math.max(0, rawRed));
  const uyariPct = Math.max(0, 100 - gectiPct - redPct);

  const kaliteSeviyeler = [
    { label: "Sertifikalı",        pct: gectiPct, color: C.mint,  text: `%${gectiPct.toFixed(2)}` },
    { label: "Kabul Edilebilir",   pct: Math.max(0, uyariPct), color: C.blue,  text: `%${Math.max(0, uyariPct).toFixed(2)}` },
    { label: "Hatalı",             pct: redPct,  color: C.peach, text: `%${redPct.toFixed(2)}`  },
  ];

  if (loading) {
    return <View style={[s.scroll, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator color={C.peach} /></View>;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Başlık */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={s.dateText}>6 Ağustos 2026</Text>
          <Text style={s.pageTitle}>Sonuçlar &</Text>
          <Text style={s.pageTitle}>Analitikler</Text>
        </View>
        <TouchableOpacity
          style={[s.exportBtn, { backgroundColor: raporYukleniyor ? C.blueLt : C.blue, borderColor: C.blue }]}
          onPress={raporIndir}
          disabled={raporYukleniyor}
        >
          {raporYukleniyor
            ? <ActivityIndicator size="small" color="white" />
            : <Download size={12} color="white" />
          }
          <Text style={[s.exportBtnText, { color: "white" }]}>
            {raporYukleniyor ? "Hazırlanıyor..." : "Rapor İndir"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Rapor Başarı Toast */}
      {raporBasarili && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.mintLt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.mint }}>
          <CheckCircle size={14} color={C.mint} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.mint }}>Rapor başarıyla indirildi!</Text>
        </View>
      )}

      {/* Stat kutucukları */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={[s.stat, { backgroundColor: C.peachLt }]}>
          <Text style={s.statLabel}>Sertifika Oranı</Text>
          <Text style={[s.statNum, { color: C.text }]}>%{gectiPct.toFixed(2)}</Text>
          <Text style={[s.statSub, { color: C.mint }]}>+%0,3 ↑</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.mintLt }]}>
          <Text style={s.statLabel}>İyi Ürünler</Text>
          <Text style={[s.statNum, { color: C.text }]}>{aktifIyiUretim > 0 ? aktifIyiUretim.toLocaleString("tr-TR") : "42.909"}</Text>
          <Text style={[s.statSub, { color: C.mint }]}>+%1,0 ↑</Text>
        </View>
      </View>

      {/* Kalite Seviye Analizi */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={s.cardTitle}>Kalite Seviye Analizi</Text>
          <ChevronRight size={14} color={C.muted} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 16 }}>
          {kaliteSeviyeler.map(q => (
            <View key={q.label} style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: q.color }}>{q.text}</Text>
              <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{q.label}</Text>
            </View>
          ))}
        </View>
        {kaliteSeviyeler.map(q => (
          <View key={q.label} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 9, width: 80, color: C.muted }}>{q.label}</Text>
            <View style={{ flex: 1, height: 6, borderRadius: 99, backgroundColor: "#D8E6F0", overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${q.pct}%`, backgroundColor: q.color, borderRadius: 99 }} />
            </View>
            <Text style={{ fontSize: 9, width: 28, textAlign: "right", color: C.muted }}>{q.text}</Text>
          </View>
        ))}
        <View style={[s.grid3, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 4 }]}>
          {[
            { label: "Sertifikalı", sub: `${aktifIyiUretim > 0 ? aktifIyiUretim.toLocaleString("tr-TR") : "42.909"} birim`, color: C.mint  },
            { label: "İncelendi",   sub: `${Math.floor((aktifIyiUretim > 0 ? aktifIyiUretim : 42909) * 0.15).toLocaleString("tr-TR")} birim doğru`, color: C.blue  },
            { label: "Aksiyon",     sub: "Bu hafta 2 denetim ekle", color: C.peach },
          ].map(r => (
            <View key={r.label} style={[s.miniCard, { backgroundColor: `${r.color}18` }]}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: r.color, marginBottom: 2 }}>{r.label}</Text>
              <Text style={{ fontSize: 8, color: C.muted, lineHeight: 12 }}>{r.sub}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Üretim Özet Bakış */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={s.cardTitle}>Üretim Özet Bakış</Text>
          <Text style={{ fontSize: 10, fontWeight: "700", color: C.mint }}>+%8,7 ↑</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
          Toplam Çalışma: <Text style={{ fontWeight: "700", color: C.text }}>{aktifToplamUretim > 0 ? aktifToplamUretim.toLocaleString("tr-TR") : "3.212"}</Text>
        </Text>
        <View style={{ height: 8, borderRadius: 99, backgroundColor: "#D8E6F0", overflow: "hidden", marginBottom: 12 }}>
          <View style={{ height: "100%", width: `${gectiPct}%`, backgroundColor: C.peach, borderRadius: 99 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[
            { dot: C.mint, label: "İyi Çıktı", val: `${aktifIyiUretim > 0 ? aktifIyiUretim.toLocaleString("tr-TR") : "521"}` },
            { dot: C.lav,  label: "Hatalı",    val: `${aktifHatali > 0 ? aktifHatali.toLocaleString("tr-TR") : "79"}`  },
          ].map(r => (
            <View key={r.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.dot }} />
              <Text style={{ fontSize: 10, color: C.muted }}>{r.label}</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: C.text }}>{r.val}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Öneriler */}
      <Card>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View style={[s.iconBox, { backgroundColor: C.blueLt }]}>
            <Zap size={14} color={C.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.cardTitle, { marginBottom: 8 }]}>Tip-M İçin Öneriler</Text>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={[s.pill, { backgroundColor: C.peachLt }]}>
                  <Text style={{ fontSize: 9, fontWeight: "600", color: C.peach }}>Kritik</Text>
                </View>
                <Text style={{ fontSize: 10, color: C.muted, flex: 1 }}>Ort. Puan %58  ·  Birimlerin %40'ı &lt;90%</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <View style={[s.pill, { backgroundColor: C.mintLt }]}>
                  <Text style={{ fontSize: 9, fontWeight: "600", color: C.mint }}>Aksiyon</Text>
                </View>
                <Text style={{ fontSize: 10, color: C.muted, flex: 1 }}>Bu hafta 2 hat denetimi + 1 atölye ekle</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Radar Grafiği */}
      <Card>
        <SH title="Kategoriye Göre Makine Performansı" action="Detaylar" onAction={() => setDetayModal(true)} />
        <View style={{ alignItems: "center" }}>
          <RadarGraf data={radarData} />
        </View>
      </Card>

      {/* Isı Haritası */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={s.cardTitle}>Üretim Hattına Göre Performans</Text>
          <Calendar size={13} color={C.muted} />
        </View>
        {/* Başlık satırı */}
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          <View style={{ width: 48 }} />
          {isiData.sutunlar?.map((c: string) => (
            <View key={c} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, fontWeight: "600", color: C.muted }}>{c}</Text>
            </View>
          ))}
        </View>
        {isiData.hatlar?.map((hat: string, ri: number) => (
          <View key={hat} style={{ flexDirection: "row", marginBottom: 4 }}>
            <View style={{ width: 48, justifyContent: "center" }}>
              <Text style={{ fontSize: 8, color: C.muted }}>{hat}</Text>
            </View>
            {isiData.degerler[ri]?.map((val: number, ci: number) => (
              <View key={ci} style={{ flex: 1, height: 16, marginHorizontal: 1, borderRadius: 3, backgroundColor: isiRengi(val) }} />
            ))}
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
          <Text style={{ fontSize: 7.5, color: C.muted }}>0–40</Text>
          {["1A", "30", "50", "80", "B0", "E0"].map(op => (
            <View key={op} style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: `${C.peach}${op}` }} />
          ))}
          <Text style={{ fontSize: 7.5, color: C.muted }}>80+</Text>
        </View>
      </Card>

      {/* Büyüme Grafiği */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={s.cardTitle}>Üretim Büyümesi</Text>
          <Text style={{ fontSize: 11, fontWeight: "700", color: C.mint }}>+%27,7 ↑</Text>
        </View>
        <Text style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>Birden Fazla Parti Üzerinden</Text>
        <LineChart
          data={buyumeData}
          width={W - 80}
          height={90}
          color={C.mint}
          thickness={2}
          dataPointsColor={C.mint}
          dataPointsRadius={3}
          areaChart
          startFillColor={C.mint}
          startOpacity={0.28}
          endOpacity={0}
          rulesColor="transparent"
          xAxisColor="transparent"
          yAxisColor="transparent"
          xAxisLabelTexts={partiBuyume.map(d => d.b)}
          xAxisLabelTextStyle={{ color: C.muted, fontSize: 8 }}
          yAxisTextStyle={{ color: C.muted, fontSize: 8 }}
          noOfSections={2}
          spacing={35}
          initialSpacing={15}
          endSpacing={15}
          minValue={55}
        />
      </Card>

      {/* Hızlı Performans Tablosu */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={s.cardTitle}>Hızlı Performans Hızlanması</Text>
          <Text style={{ fontSize: 9, color: C.muted }}>Bu hafta</Text>
        </View>
        <View style={[s.tableHeader, { borderBottomColor: C.border }]}>
          {["Öncelik", "Hat", "Durum", "Aksiyon"].map(h => (
            <Text key={h} style={s.tableHeaderText}>{h}</Text>
          ))}
        </View>
        {performansData.map((row: any, i: number) => {
          const tagStyle =
            row.oncelik === "Acil"   ? { bg: C.peachLt, color: C.peach } :
            row.oncelik === "Yüksek" ? { bg: "#EBF0FA", color: "#2E5DA8" } :
            row.oncelik === "Orta"   ? { bg: C.mintLt,  color: C.mint  } :
                                       { bg: C.blueLt,  color: C.blue  };
          return (
            <View key={i} style={[s.tableRow, { borderBottomWidth: i < performansData.length - 1 ? 1 : 0, borderBottomColor: C.border }]}>
              <View style={[s.priorityTag, { backgroundColor: tagStyle.bg }]}>
                <Text style={[s.priorityText, { color: tagStyle.color }]}>{row.oncelik}</Text>
              </View>
              <Text style={[s.tableCell, { color: C.text }]}>{row.hat}</Text>
              <Text style={[s.tableCell, { color: C.muted, fontSize: 8.5 }]}>{row.durum}</Text>
              <Text style={[s.tableCell, { color: C.peach, fontWeight: "700" }]}>{row.aksiyon}</Text>
            </View>
          );
        })}
      </Card>

      {/* Detaylar Bilgi Modalı */}
      <ModalBottomSheet
        visible={detayModal}
        onClose={() => setDetayModal(false)}
        title="Radar Grafiği Hakkında"
      >
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <View style={{ backgroundColor: C.blueLt, borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 6 }}>Bu grafik ne gösteriyor?</Text>
            <Text style={{ fontSize: 12, color: C.muted, lineHeight: 20 }}>
              Radar grafiği, makinelerinizin 6 farklı performans kategorisindeki genel durumunu karşılaştırmalı olarak gösterir.
            </Text>
          </View>
          {[
            { label: "Hız", desc: "Makinenin anlık bant hızı (b/dak)" },
            { label: "Kalite", desc: "İyi ürün oranı (%)" },
            { label: "Verimlilik", desc: "Planlanan üretim hedefine ulaşma oranı" },
            { label: "Çalışma", desc: "Toplam açık kalma süresi oranı" },
            { label: "Hassasiyet", desc: "Hata payı düşük olan üretim adedi" },
            { label: "Güvenilirlik", desc: "Arıza olmadan çalışma sürekliliği" },
          ].map(item => (
            <View key={item.label} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.peach, marginTop: 5 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.text }}>{item.label}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ModalBottomSheet>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  dateText: { fontSize: 11, color: C.muted },
  pageTitle: { fontSize: 21, fontWeight: "800", color: C.text, lineHeight: 26 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  exportBtnText: { fontSize: 11, fontWeight: "700" },
  stat: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  statLabel: { fontSize: 10, color: C.muted, marginBottom: 6 },
  statNum: { fontSize: 21, fontWeight: "800", marginBottom: 4 },
  statSub: { fontSize: 10, fontWeight: "500" },
  cardTitle: { fontSize: 13, fontWeight: "600", color: C.text },
  grid3: { flexDirection: "row", gap: 8 },
  miniCard: { flex: 1, borderRadius: 12, padding: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, alignSelf: "flex-start" },

  tableHeader: { flexDirection: "row", paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1 },
  tableHeaderText: { flex: 1, fontSize: 8, fontWeight: "700", textTransform: "uppercase", color: C.muted },
  tableRow: { flexDirection: "row", paddingVertical: 8, alignItems: "center" },
  tableCell: { flex: 1, fontSize: 9 },
  priorityTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, marginRight: 4 },
  priorityText: { fontSize: 8.5, fontWeight: "700" },
});
