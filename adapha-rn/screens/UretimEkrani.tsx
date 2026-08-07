import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { Plus, ChevronRight, Settings2 } from "lucide-react-native";
import { C } from "../constants/colors";
import { Card, SH } from "../components/Card";
import { hizProfili, performansTablo } from "../services/api";

const W = Dimensions.get("window").width;

export default function UretimEkrani() {
  const [aktifFiltre, setAktifFiltre] = useState("Tümü");

  const lineData1 = hizProfili.map(d => ({ value: d.hiz }));
  const lineData2 = hizProfili.map(d => ({ value: d.miktar }));

  const kaliteDagilim = [
    { label: "Geçti",      val: "%98,36", pct: 98.36, color: C.mint  },
    { label: "Uyarı",      val: "%1,0",   pct: 1.0,   color: C.sand  },
    { label: "Reddedildi", val: "%0,64",  pct: 0.64,  color: C.peach },
  ];

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Başlık */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View>
          <Text style={s.dateText}>6 Ağustos 2026</Text>
          <Text style={s.pageTitle}>Üretim</Text>
          <Text style={s.pageSub}>Yönetimi</Text>
        </View>
        <TouchableOpacity style={s.addBtn}>
          <Plus size={13} color="white" />
          <Text style={s.addBtnText}>Yeni Çalışma</Text>
        </TouchableOpacity>
      </View>

      {/* İstatistikler */}
      <View style={s.statRow}>
        <View style={[s.stat, { backgroundColor: C.blueLt }]}>
          <View style={s.statTopRow}>
            <Text style={s.statLabel}>Toplam Parti</Text>
            <View style={[s.miniTag, { backgroundColor: C.blue }]}>
              <Text style={s.miniTagText}>+%3,2</Text>
            </View>
          </View>
          <Text style={s.statNum}>37</Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.mintLt }]}>
          <View style={s.statTopRow}>
            <Text style={s.statLabel}>Toplam Birim</Text>
            <View style={[s.miniTag, { backgroundColor: C.mint }]}>
              <Text style={s.miniTagText}>+%1,2</Text>
            </View>
          </View>
          <Text style={s.statNum}>43.624</Text>
        </View>
      </View>



      {/* Hız & Kalite Profili */}
      <Card>
        <SH title="Hız & Kalite Profili" action="Detaylar" />
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
      <View style={[s.manageTile, { backgroundColor: C.mintLt }]}>
        <View style={[s.manageIcon, { backgroundColor: C.mint }]}>
          <Settings2 size={18} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.text }}>Tüm Çalışmaları Tek Yerden Yönet</Text>
          <Text style={{ fontSize: 10, color: C.muted }}>Mevcut model: Tip-M</Text>
        </View>
        <ChevronRight size={16} color={C.mint} />
      </View>

      {/* Ekle butonu */}
      <TouchableOpacity style={s.primaryBtn}>
        <Plus size={15} color="white" />
        <Text style={s.primaryBtnText}>Yeni Çalışma Ekle</Text>
      </TouchableOpacity>

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
      {[
        { tarih: "12 Ağu 09:00", sure: "3 saat", birim: "Birim: 100", baslik: "Sabah Üretim Çalışması", rozet: "Hat-01", durum: "Tamamlandı"   },
        { tarih: "12 Ağu 11:00", sure: "3 saat", birim: "Birim: 100", baslik: "Öğleden Sonra Çalışma", rozet: "Hat-02", durum: "Devam Ediyor" },
      ].map((b, i) => (
        <View key={i} style={s.partiCard}>
          <View style={[s.partiTop, { backgroundColor: C.peachLt }]}>
            <Text style={s.partiMeta}>{b.tarih}</Text>
            <Text style={s.partiMeta}>{b.sure}</Text>
            <Text style={s.partiMeta}>{b.birim}</Text>
          </View>
          <View style={s.partiBottom}>
            <View>
              <Text style={s.partiTitle}>{b.baslik}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                <View style={[s.partiTag, { backgroundColor: C.blueLt }]}>
                  <Text style={[s.partiTagText, { color: C.blue }]}>{b.rozet}</Text>
                </View>
                <View style={[s.partiTag, { backgroundColor: b.durum === "Tamamlandı" ? C.mintLt : C.peachLt }]}>
                  <Text style={[s.partiTagText, { color: b.durum === "Tamamlandı" ? C.mint : C.peach }]}>{b.durum}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={[s.detayBtn, { backgroundColor: C.peach }]}>
              <Text style={s.detayBtnText}>Detay</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={{ alignItems: "center", paddingVertical: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: C.peach }}>Tümünü Gör →</Text>
      </TouchableOpacity>
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
});
