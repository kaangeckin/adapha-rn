import React from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Download, ChevronRight, Zap, Award, Calendar } from "lucide-react-native";
import { C } from "../constants/colors";
import { Card, SH } from "../components/Card";
import { partiBuyume, radarVerisi, performansTablo, isiHatlar, isiSutunlar, isiDegerler } from "../services/api";

const W = Dimensions.get("window").width;

// Basit SVG Radar – react-native-svg
import Svg, { Polygon, Line, Text as SvgText, Circle } from "react-native-svg";
function RadarGraf() {
  const cx = 110, cy = 100, r = 70;
  const n = radarVerisi.length;
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
  const points = radarVerisi.map((d, i) => toXY(i, d.value));
  const pointStr = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={W - 80} height={200} viewBox="0 0 220 200">
      {/* Izgara */}
      {gridLevels.map(lv => {
        const gPts = radarVerisi.map((_, i) => toXY(i, lv));
        const gStr = gPts.map(p => `${p.x},${p.y}`).join(" ");
        return <Polygon key={lv} points={gStr} fill="none" stroke={C.border} strokeWidth="1" />;
      })}
      {/* Eksenler */}
      {radarVerisi.map((_, i) => {
        const ep = toXY(i, 100);
        return <Line key={i} x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke={C.border} strokeWidth="1" />;
      })}
      {/* Veri */}
      <Polygon points={pointStr} fill={`${C.peach}30`} stroke={C.peach} strokeWidth="2" />
      {/* Etiketler */}
      {radarVerisi.map((d, i) => {
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
  const buyumeData = partiBuyume.map(d => ({ value: d.r }));

  const kaliteSeviyeler = [
    { label: "Sertifikalı",        pct: 85, color: C.mint,  text: "%85" },
    { label: "Kabul Edilebilir",   pct: 13, color: C.blue,  text: "%13" },
    { label: "Hatalı",             pct: 2,  color: C.peach, text: "%2"  },
  ];

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Başlık */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View>
          <Text style={s.dateText}>6 Ağustos 2026</Text>
          <Text style={s.pageTitle}>Sonuçlar &</Text>
          <Text style={s.pageTitle}>Analitikler</Text>
        </View>
        <TouchableOpacity style={[s.exportBtn, { backgroundColor: C.blueLt, borderColor: C.border }]}>
          <Download size={12} color={C.blue} />
          <Text style={[s.exportBtnText, { color: C.blue }]}>Rapor İndir</Text>
        </TouchableOpacity>
      </View>

      {/* Stat kutucukları */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={[s.stat, { backgroundColor: C.peachLt }]}>
          <Text style={s.statLabel}>Sertifika Oranı</Text>
          <Text style={[s.statNum, { color: C.text }]}>%98,36</Text>
          <Text style={[s.statSub, { color: C.mint }]}>+%0,3 ↑</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.mintLt }]}>
          <Text style={s.statLabel}>İyi Ürünler</Text>
          <Text style={[s.statNum, { color: C.text }]}>42.909</Text>
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
            { label: "Sertifikalı", sub: "42.909 birim",            color: C.mint  },
            { label: "İncelendi",   sub: "5.615 birim doğru",       color: C.blue  },
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
          Toplam Çalışma: <Text style={{ fontWeight: "700", color: C.text }}>3.212</Text>
        </Text>
        <View style={{ height: 8, borderRadius: 99, backgroundColor: "#D8E6F0", overflow: "hidden", marginBottom: 12 }}>
          <View style={{ height: "100%", width: "78%", backgroundColor: C.peach, borderRadius: 99 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[
            { dot: C.mint, label: "Planlanmış Çalışma", val: "521" },
            { dot: C.lav,  label: "Öncelikli",          val: "79"  },
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
        <SH title="Kategoriye Göre Makine Performansı" action="Detaylar" />
        <View style={{ alignItems: "center" }}>
          <RadarGraf />
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
          {isiSutunlar.map(c => (
            <View key={c} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 7.5, fontWeight: "600", color: C.muted }}>{c}</Text>
            </View>
          ))}
        </View>
        {isiHatlar.map((hat, ri) => (
          <View key={hat} style={{ flexDirection: "row", marginBottom: 4 }}>
            <View style={{ width: 48, justifyContent: "center" }}>
              <Text style={{ fontSize: 8, color: C.muted }}>{hat}</Text>
            </View>
            {isiDegerler[ri].map((val, ci) => (
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
        {performansTablo.map((row, i) => {
          const tagStyle =
            row.oncelik === "Acil"   ? { bg: C.peachLt, color: C.peach } :
            row.oncelik === "Yüksek" ? { bg: "#EBF0FA", color: "#2E5DA8" } :
            row.oncelik === "Orta"   ? { bg: C.mintLt,  color: C.mint  } :
                                       { bg: C.blueLt,  color: C.blue  };
          return (
            <View key={i} style={[s.tableRow, { borderBottomWidth: i < performansTablo.length - 1 ? 1 : 0, borderBottomColor: C.border }]}>
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
