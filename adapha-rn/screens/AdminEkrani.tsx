import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { Lock, Server, Save, ChevronLeft, Wifi, WifiOff } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/colors";
import { normalizeDurum } from "../services/api";

const API_URL = "http://192.168.1.187:3000/api";

export default function AdminEkrani() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [sifre, setSifre] = useState("");
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [bantlar, setBantlar] = useState<any[]>([]);
  const [ipGirdileri, setIpGirdileri] = useState<{[key: string]: string}>({});

  const fetchBantlar = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/bantlar`);
      const data = await res.json();
      setBantlar(data);
      
      const girdiler: {[key: string]: string} = {};
      data.forEach((b: any) => {
        girdiler[b.id] = b.piIpAdresi || "";
      });
      setIpGirdileri(girdiler);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "Makineler çekilemedi.");
    }
  };

  useEffect(() => {
    if (girisYapildi) {
      fetchBantlar();
    }
  }, [girisYapildi]);

  const kaydet = async (id: string) => {
    const yeniIp = ipGirdileri[id];
    try {
      const res = await fetch(`${API_URL}/admin/bant/${id}/ip`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piIpAdresi: yeniIp })
      });
      if (res.ok) {
        Alert.alert("Başarılı", `${id} IP adresi güncellendi. Sistem yeniden bağlanmayı deniyor.`);
        fetchBantlar();
      } else {
        Alert.alert("Hata", "Güncellenemedi.");
      }
    } catch (e) {
      Alert.alert("Hata", "Bağlantı sorunu.");
    }
  };

  if (!girisYapildi) {
    return (
      <View style={[s.loginContainer, { paddingTop: insets.top }]}>
        <TouchableOpacity style={[s.backBtn, { top: Math.max(insets.top, 20) + 10 }]} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <View style={s.loginBox}>
          <View style={s.iconWrapper}>
            <Lock size={32} color={C.peach} />
          </View>
          <Text style={s.title}>Admin Girişi</Text>
          <Text style={s.sub}>Cihaz IP ayarları için yetkili şifresini girin.</Text>
          <TextInput
            style={s.input}
            placeholder="Şifre"
            secureTextEntry
            value={sifre}
            onChangeText={setSifre}
            placeholderTextColor={C.muted}
          />
          <TouchableOpacity 
            style={s.loginBtn}
            onPress={() => {
              if (sifre === "123456") setGirisYapildi(true);
              else Alert.alert("Hata", "Yanlış şifre!");
            }}
          >
            <Text style={s.loginBtnText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ChevronLeft size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Makine IP Yönetimi</Text>
        <TouchableOpacity onPress={() => { setGirisYapildi(false); setSifre(""); }} style={{ padding: 4 }}>
          <Text style={{ color: C.red, fontWeight: "600", fontSize: 13 }}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={s.content}>
        {bantlar.map(bant => {
          const acik = normalizeDurum(bant.durum) === "acik";
          return (
            <View key={bant.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Server size={18} color={C.text} />
                  <Text style={s.cardTitle}>{bant.isim} ({bant.id})</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: acik ? C.green : C.red }}>
                    {acik ? "BAĞLI" : "KOPUK"}
                  </Text>
                  {acik ? <Wifi size={14} color={C.green} /> : <WifiOff size={14} color={C.red} />}
                </View>
              </View>
              <Text style={s.label}>IP Adresi (IP:PORT)</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.ipInput}
                  value={ipGirdileri[bant.id]}
                  onChangeText={(val) => setIpGirdileri(prev => ({ ...prev, [bant.id]: val }))}
                  placeholder="192.168.1.X"
                  placeholderTextColor={C.muted}
                />
                <TouchableOpacity style={s.saveBtn} onPress={() => kaydet(bant.id)}>
                  <Save size={16} color="white" />
                  <Text style={s.saveBtnText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.infoText}>Değişiklik anında devreye girer. Eski ağdan kopulup yeni IP'ye bağlanılır.</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  loginContainer: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", padding: 20 },
  backBtn: { position: "absolute", top: 60, left: 20, padding: 8 },
  loginBox: { backgroundColor: "white", padding: 24, borderRadius: 24, width: "100%", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.peachLt, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 8 },
  sub: { fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24 },
  input: { backgroundColor: C.bg, width: "100%", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  loginBtn: { backgroundColor: C.peach, width: "100%", borderRadius: 12, padding: 14, alignItems: "center" },
  loginBtnText: { color: "white", fontSize: 16, fontWeight: "700" },

  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: "white", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.bg, paddingBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  label: { fontSize: 12, fontWeight: "600", color: C.muted, marginBottom: 8 },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  ipInput: { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: C.text },
  saveBtn: { backgroundColor: C.blue, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { color: "white", fontWeight: "600", fontSize: 13 },
  infoText: { fontSize: 10, color: C.muted }
});
