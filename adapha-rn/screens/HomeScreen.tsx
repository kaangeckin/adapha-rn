import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Animated, Easing, Image, DeviceEventEmitter
} from "react-native";
import { WebView } from "react-native-webview";
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
import { ChevronLeft } from "lucide-react-native";

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

function SimulasyonEkrani({ acik, kameraUrl, slideX }: { acik: boolean; kameraUrl?: string; slideX: Animated.AnimatedInterpolation<number> }) {
  return (
    <View style={s.simContainer}>
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`h${i}`} style={[s.gridLine, { top: i * 20, width: "100%" }]} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <View key={`v${i}`} style={[s.gridLine, { left: i * 20, height: "100%", width: 1 }]} />
        ))}
      </View>
      <View style={s.beltOuter}>
        <View style={[s.belt, { backgroundColor: acik ? "#1A3A5C" : "#2A0A0A", borderColor: acik ? "transparent" : C.red }]}>
          {acik ? (
            <View style={StyleSheet.absoluteFill}>
              <Animated.View style={[s.stripe, { transform: [{ translateX: slideX }] }]} />
            </View>
          ) : (
            <Text style={[s.beltText, { color: C.red }]}>DURDU</Text>
          )}
        </View>
        <Text style={[s.beltStatus, { color: acik ? C.green : C.red }]}>
          {acik ? "● BANT HAREKETLİ" : "● BANT DURDU"}
        </Text>
      </View>
      <View style={s.connInfo}>
        <Text style={s.connText}>Kamera bağlantısı bekleniyor</Text>
        <Text style={s.connUrl}>{kameraUrl}</Text>
      </View>
    </View>
  );
}

function KameraKarti({ bant }: { bant: Bant }) {
  const acik = bant.durum === "acik";
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Sadece istendiğinde fotoğrafı tutacak state
  const [aktifFoto, setAktifFoto] = React.useState<string | null>(null);

  // Butona basınca o anki zaman damgası ile benzersiz bir URL oluşturup resmi çeker (cache engeller)
  const fotografIste = () => {
    if (bant.kameraUrl) {
      setAktifFoto(`${bant.kameraUrl}?t=${Date.now()}`);
    }
  };

  React.useEffect(() => {
    if (acik) {
      Animated.loop(
        Animated.timing(slideAnim, {
          toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true,
        })
      ).start();
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [acik]);

  const slideX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 300] });

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={s.cardTitle}>Anlık Kontrol</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {aktifFoto && (
            <TouchableOpacity onPress={fotografIste} style={{ backgroundColor: C.peach, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "white" }}>Yenile</Text>
            </TouchableOpacity>
          )}
          <View style={{ backgroundColor: acik ? "rgba(76, 217, 100, 0.1)" : "rgba(255, 59, 48, 0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: acik ? C.green : C.red }}>{bant.id}-CAM</Text>
          </View>
        </View>
      </View>
      
      <View style={s.cameraArea}>
        {aktifFoto ? (
          <Image
            source={{ uri: aktifFoto }}
            style={s.webview}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.simContainer, { paddingHorizontal: 24 }]}>
            {bant.kameraUrl ? (
              <>
                <TouchableOpacity onPress={fotografIste} style={{ backgroundColor: C.peach, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 }}>
                  <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>Anlık Görüntü Al</Text>
                </TouchableOpacity>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, textAlign: "center", marginTop: 12 }}>
                  Sürekli akış yerine, sadece ihtiyaç duyduğunuzda kameradan o anki taze fotoğrafı çekebilirsiniz.
                </Text>
              </>
            ) : (
              <SimulasyonEkrani acik={acik} kameraUrl={bant.kameraUrl} slideX={slideX} />
            )}
          </View>
        )}

        <View style={s.liveBadge}>
          <Animated.View style={[s.liveDot, { backgroundColor: acik ? C.green : C.red, opacity: pulseAnim }]} />
          <Text style={s.liveText}>{acik ? "CANLI" : "ÇEVRİMDIŞI"}</Text>
        </View>
      </View>
    </Card>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [ozet, setOzet] = useState({ aktifHatSayisi: 0, toplamCikti: 0, anlikHizOrta: 0 });
  const [bantlar, setBantlar] = useState<Bant[]>([]);
  const [loading, setLoading] = useState(true);
  const [aktifProgramFiltre, setAktifProgramFiltre] = useState("Tümü");
  const [seciliBant, setSeciliBant] = useState<Bant | null>(null);

  useEffect(() => {
    // 1. İlk yüklemede API'den gerçek veriyi çek
    const verileriCek = async () => {
      setLoading(true);
      const [ozetVeri, bantVeri] = await Promise.all([
        dashboardOzetiniCek(),
        bantVerisiniCek()
      ]);
      setOzet(ozetVeri);
      setBantlar(bantVeri);
      setLoading(false);
    };

    verileriCek();
    const refreshListener = DeviceEventEmitter.addListener("onGlobalRefresh", () => {
      if (navigation.isFocused()) {
        verileriCek();
      }
    });

    // 2. WebSocket üzerinden anlık hız güncellemelerini (Simülatör) dinle
    socket.on("bant_hiz_guncelleme", (guncellemeler: { id: string, anlikHiz: number }[]) => {
      setBantlar(prev => {
        let hizToplami = 0;
        let acikSayisi = 0;
        const yeniBantlar = prev.map(bant => {
          const guncel = guncellemeler.find(g => g.id === bant.id);
          const yeniHiz = guncel ? guncel.anlikHiz : bant.anlikHiz;
          if (bant.durum === "acik") {
            hizToplami += (yeniHiz || 0);
            acikSayisi++;
          }
          return { ...bant, anlikHiz: yeniHiz };
        });

        // Ortalama hızı da canlı güncelle
        if (acikSayisi > 0) {
          setOzet(eski => ({ ...eski, anlikHizOrta: hizToplami / acikSayisi }));
        }

        return yeniBantlar;
      });
    });

    // 3. Gerçek Raspberry Pi'den gelen full güncellemeleri dinle
    socket.on("bant_guncellendi", (guncelBant: Bant) => {
      setBantlar(prev => {
        const kopya = [...prev];
        const idx = kopya.findIndex(b => b.id === guncelBant.id);
        if (idx !== -1) {
          kopya[idx] = { ...kopya[idx], ...guncelBant };
        } else {
          kopya.push(guncelBant);
        }
        return kopya;
      });
    });

    return () => {
      socket.off("bant_hiz_guncelleme");
      socket.off("bant_guncellendi");
      refreshListener.remove();
    };
  }, []);

  if (loading) {
    return <View style={[s.scroll, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator color={C.peach} /></View>;
  }

  const guncelSeciliBant = seciliBant ? bantlar.find(b => b.id === seciliBant.id) || seciliBant : null;

  // EĞER BİR BANT SEÇİLİ DEĞİLSE SADECE LİSTEYİ GÖSTER
  if (!guncelSeciliBant) {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={{ zIndex: 1 }}>
            <Text style={s.heroDate}>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <Text style={s.heroTitle}>Tesis Genel Bakış</Text>
            <Text style={s.heroSub}>Jiangsu JWC Machinery Co., Ltd</Text>
          </View>
          <View style={s.heroBubble1} />
          <View style={s.heroBubble2} />
        </View>

        <Text style={[s.cardTitle, { marginTop: 8, marginBottom: 4, paddingHorizontal: 4 }]}>Üretim Bantları</Text>
        
        <View style={{ gap: 12 }}>
          {bantlar.map(m => (
            <TouchableOpacity key={m.id} style={s.machineCardWide} onPress={() => setSeciliBant(m)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={s.machineTitleWide}>{m.isim}</Text>
                <ChevronRight size={18} color={C.peach} />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <View style={[s.dot, { backgroundColor: m.durum === "acik" ? C.mint : C.muted }]} />
                <Text style={[s.machineLive, { color: m.durum === "acik" ? C.mint : C.muted }]}>
                  {m.durum === "acik" ? "Çalışıyor" : "Pasif"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
                <View>
                  <Text style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Anlık Hız</Text>
                  <Text style={s.machineRateWide}>{m.anlikHiz?.toFixed(1) || 0} b/s</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Üretim</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: C.text }}>{(m.toplamUretim || 0).toLocaleString("tr-TR")}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  // BİR BANT SEÇİLİ İSE SADECE ONUN DETAYLARINI GÖSTER
  // Grafik verisi (Zamanla API'ye bağlanacak)
  const lineData2 = (aylikUretim || []).map(d => ({ value: d.cikti }));
  const lineData3 = (aylikUretim || []).map(d => ({ value: d.iyi }));

  // CANLI VERİLERDEN HESAPLANAN ÖZETLER
  const aktifToplamUretim = guncelSeciliBant.toplamUretim || 0;
  const aktifIyiUretim = guncelSeciliBant.iyiUretim || 0;
  const ortalamaSertifika = guncelSeciliBant.sertifikaOrani || 0;

  const hataliUretim = Math.max(0, aktifToplamUretim > 0 ? (aktifToplamUretim - aktifIyiUretim) : 0);
  const rawHataOrani = aktifToplamUretim > 0 ? (hataliUretim / aktifToplamUretim * 100) : 0;
  const hataOrani = Math.min(100, Math.max(0, rawHataOrani));

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      <TouchableOpacity style={s.backBtn} onPress={() => setSeciliBant(null)}>
        <ChevronLeft size={20} color={C.peach} />
        <Text style={s.backBtnText}>Tüm Bantlara Dön</Text>
      </TouchableOpacity>

      {/* Hero */}
      <View style={s.hero}>
        <View style={{ zIndex: 1 }}>
          <Text style={s.heroDate}>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          <Text style={s.heroTitle}>{guncelSeciliBant.isim} Detayları</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Text style={[s.heroSub, { marginTop: 0 }]}>Anlık İzleme Paneli</Text>
            {guncelSeciliBant.mevcutModel ? (
              <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, color: "white", fontWeight: "800" }}>Model: {guncelSeciliBant.mevcutModel}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Model: Bekleniyor...</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.heroBubble1} />
        <View style={s.heroBubble2} />
      </View>

      {/* Stat kutucukları */}
      <View style={s.statRow}>
        <View style={[s.stat, { backgroundColor: guncelSeciliBant.durum === "acik" ? C.mintLt : C.peachLt }]}>
          <View style={s.statDotRow}>
            <View style={[s.dot, { backgroundColor: guncelSeciliBant.durum === "acik" ? C.mint : C.peach }]} />
            <Text style={s.statLabel}>Durum</Text>
          </View>
          <Text style={[s.statNum, { color: C.text, fontSize: 18, marginTop: 4 }]}>{guncelSeciliBant.durum === "acik" ? "Çalışıyor" : "Pasif"}</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.blueLt }]}>
          <View style={s.statDotRow}>
            <Package size={11} color={C.blue} />
            <Text style={s.statLabel}>Toplam Çıktı</Text>
          </View>
          <Text style={[s.statNum, { color: C.text, fontSize: 18, marginTop: 4 }]}>{aktifToplamUretim.toLocaleString("tr-TR")}</Text>
        </View>
      </View>

      {/* Canlı Kamera Akışı */}
      <KameraKarti bant={guncelSeciliBant} />

      <Card>
        <View style={s.gaugeBox}>
          <Text style={s.gaugeLabel}>Anlık Hız</Text>
          <SvgGauge value={guncelSeciliBant.anlikHiz || 0} />
        </View>
      </Card>

      {/* Makine Performansı (Sayısal Görünüm) */}
      <Card>
        <SH title="Makine Performansı" />
        
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
          <View style={{ width: "47%", backgroundColor: C.mintLt, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>OEE Puanı</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.mint }}>{guncelSeciliBant.oee ? guncelSeciliBant.oee.toFixed(1) : "0"}</Text>
          </View>
          
          <View style={{ width: "47%", backgroundColor: C.blueLt, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Kullanılabilirlik</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.blue }}>{guncelSeciliBant.availability ? guncelSeciliBant.availability.toFixed(1) : "0"}</Text>
          </View>

          <View style={{ width: "47%", backgroundColor: C.peachLt, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Duruş Süresi</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.peach }}>{guncelSeciliBant.duruşSuresiSn ? guncelSeciliBant.duruşSuresiSn.toFixed(0) : "0"} <Text style={{ fontSize: 12, fontWeight: "600" }}>sn</Text></Text>
          </View>
          
          <View style={{ width: "47%", backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, padding: 12, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Çalışma Süresi</Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: C.text }}>{guncelSeciliBant.calismaSuresi ? guncelSeciliBant.calismaSuresi.toFixed(1) : "0"} <Text style={{ fontSize: 12, fontWeight: "600" }}>dk</Text></Text>
          </View>
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
  machineCardWide: { borderRadius: 16, padding: 16, backgroundColor: "white", borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  machineTitleWide: { fontSize: 14, fontWeight: "700", color: C.text },
  machineTimeWide: { fontSize: 11, color: C.muted },
  machineRateWide: { fontSize: 18, fontWeight: "800", color: C.peach },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, paddingVertical: 4 },
  backBtnText: { fontSize: 14, fontWeight: "600", color: C.peach },

  // Kamera Stilleri
  cameraArea: { aspectRatio: 16/9, backgroundColor: "#050D18", borderRadius: 12, overflow: "hidden", position: "relative" },
  webview: { flex: 1 },
  liveBadge: { position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: "700", color: "white" },
  simContainer: { flex: 1, backgroundColor: "#070F1C", justifyContent: "center", alignItems: "center" },
  gridLine: { position: "absolute", backgroundColor: "rgba(255,255,255,0.03)" },
  beltOuter: { alignItems: "center", width: "100%" },
  belt: { width: "80%", height: 40, borderRadius: 4, overflow: "hidden", justifyContent: "center", alignItems: "center", borderWidth: 1, marginBottom: 8 },
  stripe: { position: "absolute", top: 0, bottom: 0, width: 6, backgroundColor: "rgba(255,255,255,0.3)" },
  beltText: { fontSize: 11, fontWeight: "700" },
  beltStatus: { fontSize: 9, fontWeight: "700" },
  connInfo: { position: "absolute", bottom: 8, left: 0, right: 0, alignItems: "center" },
  connText: { fontSize: 8, color: "rgba(255,255,255,0.5)" },
  connUrl: { fontSize: 7.5, color: "rgba(255,255,255,0.35)" },
});
