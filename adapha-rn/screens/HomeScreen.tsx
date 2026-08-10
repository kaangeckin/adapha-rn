import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import {
  Zap, Package, Clock, ChevronRight, Shield, Search, Plus,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { C } from "../constants/colors";
import { Card, SH } from "../components/Card";
import { BantDurumuPaneli } from "../components/BantDurumuPaneli";
import ModalBottomSheet from "../components/ModalBottomSheet";
import { hizProfili, aylikUretim, programVerisi, dashboardOzetiniCek, bantVerisiniCek, socket, Bant } from "../services/api";

const W = Dimensions.get("window").width;

// SVG Gösterge – react-native-svg ile
import Svg, { Path, Line, Text as SvgText, Polygon, Circle } from "react-native-svg";
function SvgGauge({ value = 0 }: { value?: number }) {
  const max = 300, cx = 120, cy = 118, r = 92;
  const ang = (v: number) => Math.PI * (1 - Math.min(v, max) / max);
  const pt = (a: number, rad: number) => ({
    x: cx + rad * Math.cos(a),
    y: cy - rad * Math.sin(a),
  });
  const arcL = pt(Math.PI, r), arcR = pt(0, r);
  const arcPath = `M ${arcL.x.toFixed(1)} ${arcL.y.toFixed(1)} A ${r} ${r} 0 0 1 ${arcR.x.toFixed(1)} ${arcR.y.toFixed(1)}`;
  const na = ang(value), tip = pt(na, r - 12), b1 = pt(na + Math.PI / 2, 5), b2 = pt(na - Math.PI / 2, 5);
  const ticks = [0, 50, 100, 150, 200, 250, 300];
  return (
    <Svg viewBox="0 0 240 132" width="100%" height={132}>
      <Path d={arcPath} fill="none" stroke="#C8D8E8" strokeWidth="14" strokeLinecap="round" />
      {ticks.map(t => {
        const a = ang(t), o = pt(a, r + 4), ii = pt(a, r - 16), lp = pt(a, r - 30);
        return (
          <React.Fragment key={t}>
            <Line x1={ii.x} y1={ii.y} x2={o.x} y2={o.y} stroke="#8AAAC8" strokeWidth="1.5" />
            <SvgText x={lp.x} y={lp.y} textAnchor="middle" alignmentBaseline="middle" fontSize="8" fill="#5E7389">{t}</SvgText>
          </React.Fragment>
        );
      })}
      <Polygon points={`${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${b1.x.toFixed(1)},${b1.y.toFixed(1)} ${b2.x.toFixed(1)},${b2.y.toFixed(1)}`} fill={C.peach} />
      <Circle cx={cx} cy={cy} r="9" fill={C.peach} />
      <Circle cx={cx} cy={cy} r="4" fill={C.bg} />
      <SvgText x={cx} y={cy - 30} textAnchor="middle" fontSize="38" fontWeight="800" fill={C.peach}>{value.toFixed(1)}</SvgText>
      <SvgText x={cx} y={cy - 11} textAnchor="middle" fontSize="9.5" fill={C.muted}>birim / dak</SvgText>
    </Svg>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [ozet, setOzet] = useState({ aktifHatSayisi: 0, toplamCikti: 0, anlikHizOrta: 0 });
  const [canliBantlar, setCanliBantlar] = useState<Bant[]>([]);
  const [loading, setLoading] = useState(true);
  const [yeniCalismaModal, setYeniCalismaModal] = useState(false);
  const [aktifProgramFiltre, setAktifProgramFiltre] = useState("Tümü");
  const [secilenHat, setSecilenHat] = useState("Hat-01");
  const [secilenTip, setSecilenTip] = useState("Tip-M");
  const [calismaOlusturuldu, setCalismaOlusturuldu] = useState(false);

  useEffect(() => {
    // 1. İlk yüklemede API'den gerçek veriyi çek
    const verileriCek = async () => {
      const [ozetVeri, bantVeri] = await Promise.all([
        dashboardOzetiniCek(),
        bantVerisiniCek()
      ]);
      setOzet(ozetVeri);
      setCanliBantlar(bantVeri.filter(b => b.durum === "acik").slice(0, 3)); // İlk 3 açık bant
      setLoading(false);
    };

    verileriCek();

    // 2. WebSocket üzerinden anlık hız güncellemelerini (Simülatör) dinle
    socket.on("bant_hiz_guncelleme", (guncellemeler: { id: string, anlikHiz: number }[]) => {
      setCanliBantlar(prev => {
        let hizToplami = 0;
        const yeniBantlar = prev.map(bant => {
          const guncel = guncellemeler.find(g => g.id === bant.id);
          const yeniHiz = guncel ? guncel.anlikHiz : bant.anlikHiz;
          hizToplami += (yeniHiz || 0);
          return { ...bant, anlikHiz: yeniHiz };
        });
        
        // Ortalama hızı da canlı güncelle
        if (yeniBantlar.length > 0) {
          setOzet(eski => ({ ...eski, anlikHizOrta: hizToplami / yeniBantlar.length }));
        }
        
        return yeniBantlar;
      });
    });

    // 3. Gerçek Raspberry Pi'den gelen full güncellemeleri dinle
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
      socket.off("bant_hiz_guncelleme");
      socket.off("bant_guncellendi");
    };
  }, []);

  // Grafik verisi (Zamanla API'ye bağlanacak)
  const lineData2 = aylikUretim.map(d => ({ value: d.cikti }));
  const lineData3 = aylikUretim.map(d => ({ value: d.iyi }));

  // CANLI VERİLERDEN HESAPLANAN ÖZETLER
  const aktifToplamUretim = canliBantlar.reduce((sum, b) => sum + (b.toplamUretim || 0), 0) || ozet.toplamCikti;
  const aktifIyiUretim = canliBantlar.reduce((sum, b) => sum + (b.iyiUretim || 0), 0);
  const ortalamaSertifika = canliBantlar.filter(b => b.sertifikaOrani).length > 0
    ? canliBantlar.reduce((sum, b) => sum + (b.sertifikaOrani || 0), 0) / canliBantlar.filter(b => b.sertifikaOrani).length
    : 0;
  
  const hataliUretim = aktifToplamUretim > 0 ? (aktifToplamUretim - aktifIyiUretim) : 0;
  const hataOrani = aktifToplamUretim > 0 ? (hataliUretim / aktifToplamUretim * 100) : 0;

  if (loading) {
    return <View style={[s.scroll, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator color={C.peach} /></View>;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={s.hero}>
        <View style={{ zIndex: 1 }}>
          <Text style={s.heroDate}>6 Ağustos 2026</Text>
          <Text style={s.heroTitle}>Makine Genel Bakış</Text>
          <Text style={s.heroSub}>Jiangsu JWC Machinery Co., Ltd</Text>
          <TouchableOpacity style={s.heroBtn} onPress={() => setYeniCalismaModal(true)}>
            <Zap size={12} color="white" />
            <Text style={s.heroBtnText}>Yeni Çalışma Başlat</Text>
          </TouchableOpacity>
        </View>
        <View style={s.heroBubble1} />
        <View style={s.heroBubble2} />
      </View>

      {/* Başarı bildirimi */}
      {calismaOlusturuldu && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.mintLt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.mint }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.mint }}>✓ Yeni çalışma oluşturuldu!</Text>
        </View>
      )}

      {/* Stat kutucukları (GERÇEK VERİ) */}
      <View style={s.statRow}>
        <View style={[s.stat, { backgroundColor: C.mintLt }]}>
          <View style={s.statDotRow}>
            <View style={[s.dot, { backgroundColor: C.mint }]} />
            <Text style={s.statLabel}>Aktif Hatlar</Text>
          </View>
          <Text style={[s.statNum, { color: C.text }]}>{ozet.aktifHatSayisi}</Text>
          <Text style={[s.statSub, { color: C.mint }]}>● Şu An Çalışıyor</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.blueLt }]}>
          <View style={s.statDotRow}>
            <Package size={11} color={C.blue} />
            <Text style={s.statLabel}>Toplam Çıktı</Text>
          </View>
          <Text style={[s.statNum, { color: C.text }]}>{aktifToplamUretim.toLocaleString("tr-TR")}</Text>
          <Text style={[s.statSub, { color: C.blue }]}>+2,1% ↑</Text>
        </View>
      </View>

      {/* Bant Durumu */}
      <BantDurumuPaneli />

      {/* Canlı İzleme (GERÇEK VERİ VE WEBSOCKET) */}
      <Card>
        <SH title="Canlı Makine İzleme" action="Tümünü Gör" onAction={() => navigation.navigate("Üretim")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
          {canliBantlar.map(m => (
            <View key={m.id} style={s.machineCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={s.machineTitle}>{m.isim}</Text>
                <ChevronRight size={11} color={C.peach} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <View style={[s.dot, { backgroundColor: C.mint }]} />
                <Text style={[s.machineLive, { color: C.mint }]}>Canlı</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <Clock size={8} color={C.muted} />
                <Text style={s.machineTime}>09:00 – 17:00</Text>
              </View>
              <Text style={s.machineRate}>{m.anlikHiz?.toFixed(1) || 0} b/s</Text>
            </View>
          ))}
        </ScrollView>
        {/* Hız göstergesi (CANLI VERİ) */}
        <View style={s.gaugeBox}>
          <Text style={s.gaugeLabel}>Ortalama Anlık Hız</Text>
          <SvgGauge value={ozet.anlikHizOrta} />
        </View>
      </Card>

      {/* Makine Performansı */}
      <Card>
        <SH title="Makine Performansı" action="Detaylar" />
        <View style={s.perfRow}>
          <Text style={s.perfLabel}>En Yaygın Hata</Text>
          <Text style={s.perfVal}>Yüzey Çizimi (Bekleniyor)</Text>
        </View>
        <View style={s.perfRow}>
          <Text style={s.perfLabel}>Hata Oranı</Text>
          <Text style={[s.perfVal, { color: C.peach }]}>%{hataOrani.toFixed(2)}</Text>
        </View>
      </Card>

      {/* Kalite Kontrol */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <View style={[s.iconBox, { backgroundColor: C.mintLt }]}>
                <Shield size={13} color={C.mint} />
              </View>
              <Text style={[s.perfVal, { color: C.text }]}>Kalite Kontrol Aktif</Text>
            </View>
            <Text style={s.perfLabel}>İnceleme Bekleyen (Hatalı) Birimler</Text>
            <Text style={[s.statNum, { color: C.peach, marginTop: 4 }]}>{hataliUretim} birim</Text>
          </View>
          <View style={[s.badge, { backgroundColor: C.peachLt }]}>
            <Text style={[s.badgeText, { color: C.peach }]}>%{hataOrani.toFixed(2)}</Text>
          </View>
        </View>
      </Card>

      {/* Aylık Üretim Grafiği */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={s.cardTitle}>Üretim Oranı - İyi Oran</Text>
          <View style={[s.badge, { backgroundColor: C.peachLt }]}>
            <Text style={[s.badgeText, { color: C.peach }]}>Aylık</Text>
          </View>
        </View>
        <Text style={[s.perfLabel, { marginBottom: 12 }]}>Sertifika Oranı (Canlı): <Text style={[s.perfVal, { color: C.text }]}>%{ortalamaSertifika.toFixed(2)}</Text></Text>
        <View style={{ flexDirection: "row", gap: 16, marginBottom: 8 }}>
          {[{ c: C.blue, l: "Çıktı" }, { c: C.mint, l: "İyi" }].map(({ c, l }) => (
            <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 16, height: 2, backgroundColor: c, borderRadius: 1 }} />
              <Text style={[s.perfLabel]}>{l}</Text>
            </View>
          ))}
        </View>
        <LineChart
          data={lineData2}
          data2={lineData3}
          width={W - 80}
          height={100}
          color1={C.blue}
          color2={C.mint}
          thickness={2}
          hideDataPoints
          areaChart
          startFillColor1={C.blue}
          startFillColor2={C.mint}
          startOpacity1={0.22}
          startOpacity2={0.22}
          endOpacity1={0}
          endOpacity2={0}
          xAxisLabelTexts={aylikUretim.map(d => d.ay)}
          xAxisLabelTextStyle={{ color: C.muted, fontSize: 8 }}
          yAxisTextStyle={{ color: C.muted, fontSize: 8 }}
          hideYAxisText={false}
          rulesColor="transparent"
          xAxisColor="transparent"
          yAxisColor="transparent"
          noOfSections={4}
          initialSpacing={8}
          endSpacing={8}
        />
      </Card>

      {/* Üretim Özeti */}
      <Card>
        <SH title="Üretim Özeti" action="Detaylar" />
        {[
          { dot: C.mint, label: "İyi Ürünler", val: `%${ortalamaSertifika.toFixed(2)}  ·  ${aktifIyiUretim.toLocaleString("tr-TR")}` },
          { dot: C.peachMd, label: "Hatalı / Fire", val: `%${hataOrani.toFixed(2)}   ·  ${hataliUretim.toLocaleString("tr-TR")}` },
        ].map(r => (
          <View key={r.label} style={s.summaryRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[s.dot, { backgroundColor: r.dot }]} />
              <Text style={s.perfLabel}>{r.label}</Text>
            </View>
            <Text style={s.perfVal}>{r.val}</Text>
          </View>
        ))}
        <View style={s.divider} />
        {[
          { label: "Sertifikalı Üretim", pct: `%${ortalamaSertifika.toFixed(2)}`, adet: `${aktifIyiUretim.toLocaleString("tr-TR")} birim`, color: C.mint },
          { label: "Standart Altı", pct: `%${hataOrani.toFixed(2)}`, adet: `${hataliUretim.toLocaleString("tr-TR")} birim`, color: C.peach },
        ].map(row => (
          <View key={row.label} style={s.summaryRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[s.smallDot, { backgroundColor: row.color }]} />
              <Text style={s.perfLabel}>{row.label}</Text>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Text style={s.perfVal}>{row.pct}</Text>
              <Text style={[s.perfLabel, { marginLeft: 8 }]}>{row.adet}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Üretim Programı */}
      <Card>
        <SH title="Üretim Programı" action="+ Çalışma Ekle" />
        <View style={[s.searchBar, { backgroundColor: C.blueLt }]}>
          <Search size={12} color={C.muted} />
          <Text style={s.searchText}>Program ara...</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {["Tümü", "Tip-M", "Tip-A", "Tip-B"].map((f) => (
            <TouchableOpacity key={f} onPress={() => setAktifProgramFiltre(f)} style={[s.chip, aktifProgramFiltre === f ? { backgroundColor: C.peach } : { backgroundColor: C.blueLt }]}>
              <Text style={[s.chipText, { color: aktifProgramFiltre === f ? "white" : C.muted }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={[s.tableHeader, { borderBottomColor: C.border }]}>
          {["Parti", "Hat", "Tip", "Başlangıç"].map(h => (
            <Text key={h} style={s.tableHeaderText}>{h}</Text>
          ))}
        </View>
        {programVerisi
          .filter(row => aktifProgramFiltre === "Tümü" || row.tip === aktifProgramFiltre)
          .map((row, i, arr) => (
          <View key={i} style={[s.tableRow, { borderBottomColor: C.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
            <Text style={s.tableCell}>{row.parti}</Text>
            <Text style={s.tableCell}>{row.hat}</Text>
            <Text style={s.tableCell}>{row.tip}</Text>
            <Text style={[s.tableCell, { color: C.muted }]}>{row.saat}</Text>
          </View>
        ))}
      </Card>

      {/* Yeni Çalışma Modalı */}
      <ModalBottomSheet
        visible={yeniCalismaModal}
        onClose={() => setYeniCalismaModal(false)}
        title="Yeni Çalışma Oluştur"
      >
        <View style={{ gap: 16, paddingBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 10 }}>Hat Seçimi</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["Hat-01", "Hat-02", "Hat-03", "Hat-04"].map(h => (
                <TouchableOpacity
                  key={h}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: secilenHat === h ? C.peach : C.border, backgroundColor: secilenHat === h ? C.peach : "white" }}
                  onPress={() => setSecilenHat(h)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: secilenHat === h ? "white" : C.muted }}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: C.text, marginBottom: 10 }}>Ürün Tipi</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["Tip-M", "Tip-A", "Tip-B", "Tip-C"].map(t => (
                <TouchableOpacity
                  key={t}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: secilenTip === t ? C.peach : C.border, backgroundColor: secilenTip === t ? C.peach : "white" }}
                  onPress={() => setSecilenTip(t)}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: secilenTip === t ? "white" : C.muted }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ borderRadius: 12, padding: 14, backgroundColor: C.mintLt }}>
            <Text style={{ fontSize: 11, color: C.mint, fontWeight: "600" }}>Özet</Text>
            <Text style={{ fontSize: 12, color: C.text, marginTop: 4 }}>
              <Text style={{ fontWeight: "700" }}>{secilenHat}</Text> hattında{" "}
              <Text style={{ fontWeight: "700" }}>{secilenTip}</Text> tipinde yeni çalışma başlatılacak.
            </Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.peach, paddingVertical: 12, borderRadius: 16 }}
            onPress={() => {
              setYeniCalismaModal(false);
              setCalismaOlusturuldu(true);
              setTimeout(() => setCalismaOlusturuldu(false), 3000);
            }}
          >
            <Plus size={15} color="white" />
            <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>Çalışmayı Başlat</Text>
          </TouchableOpacity>
        </View>
      </ModalBottomSheet>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 16, paddingBottom: 32 },

  hero: {
    backgroundColor: C.peach, borderRadius: 24, padding: 20, overflow: "hidden", gap: 0,
    shadowColor: C.peach, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6
  },
  heroBubble1: { position: "absolute", right: -32, top: -32, width: 112, height: 112, borderRadius: 56, backgroundColor: "rgba(255,255,255,0.13)" },
  heroBubble2: { position: "absolute", right: 20, bottom: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.09)" },
  heroDate: { color: "rgba(255,255,255,0.7)", fontSize: 10, marginBottom: 2 },
  heroTitle: { color: "white", fontSize: 21, fontWeight: "800", lineHeight: 26 },
  heroSub: { color: "rgba(255,255,255,0.65)", fontSize: 10, marginBottom: 12 },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.20)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, alignSelf: "flex-start" },
  heroBtnText: { color: "white", fontSize: 11, fontWeight: "600" },

  statRow: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border },
  statDotRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  statLabel: { fontSize: 10, color: C.muted },
  statNum: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  statSub: { fontSize: 10, fontWeight: "500" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  smallDot: { width: 6, height: 6, borderRadius: 3 },

  machineCard: { width: 156, borderRadius: 16, padding: 12, backgroundColor: C.peachLt, borderWidth: 1, borderColor: C.peachMd, marginHorizontal: 4 },
  machineTitle: { fontSize: 10, fontWeight: "600", color: C.text, flex: 1 },
  machineLive: { fontSize: 9, fontWeight: "600" },
  machineTime: { fontSize: 9, color: C.muted },
  machineRate: { fontSize: 12, fontWeight: "700", color: C.peach },

  gaugeBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  gaugeLabel: { fontSize: 10, fontWeight: "600", color: C.muted, textAlign: "center", marginBottom: 4 },

  perfRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  perfLabel: { fontSize: 11, color: C.muted },
  perfVal: { fontSize: 11, fontWeight: "600", color: C.text },

  iconBox: { width: 28, height: 28, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: "600" },

  cardTitle: { fontSize: 13, fontWeight: "600", color: C.text },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },

  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  searchText: { fontSize: 11, color: C.muted },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginRight: 8 },
  chipText: { fontSize: 10, fontWeight: "600" },
  tableHeader: { flexDirection: "row", paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1 },
  tableHeaderText: { flex: 1, fontSize: 8.5, fontWeight: "700", textTransform: "uppercase", color: C.muted },
  tableRow: { flexDirection: "row", paddingVertical: 8, alignItems: "center" },
  tableCell: { flex: 1, fontSize: 10, color: C.text },
});
