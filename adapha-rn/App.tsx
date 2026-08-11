import React from "react";
import { View, Text, StatusBar, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Package, BarChart2, Bell, RefreshCw, AlignLeft } from "lucide-react-native";
import { C } from "./constants/colors";
import HomeScreen from "./screens/HomeScreen";
import UretimEkrani from "./screens/UretimEkrani";
import AnalizEkrani from "./screens/AnalizEkrani";
import AdminEkrani from "./screens/AdminEkrani";
import BildirimlerEkrani from "./screens/BildirimlerEkrani";
import { GlobalNotification } from "./components/GlobalNotification";
import { useNavigation } from "@react-navigation/native";

const Tab = createBottomTabNavigator();

function AppHeader() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
      <View style={styles.headerLeft}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate("Admin")}>
          <AlignLeft size={16} color={C.peach} />
        </TouchableOpacity>
        <View>
          <Text style={styles.platformTag}>JWC Platform</Text>
          <Text style={styles.companyName}>Jiangsu JWC Machinery</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Bildirimler")}>
          <Bell size={14} color={C.peach} />
        </TouchableOpacity>
        <View style={[styles.iconBtn, { backgroundColor: C.blueLt }]}>
          <RefreshCw size={13} color={C.blue} />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <GlobalNotification />
      <NavigationContainer>
        <View style={styles.container}>
          <AppHeader />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarActiveTintColor: C.peach,
              tabBarInactiveTintColor: C.muted,
              tabBarLabelStyle: styles.tabLabel,
              tabBarIcon: ({ color, size }) => {
                if (route.name === "AnaSayfa") return <Home size={size} color={color} />;
                if (route.name === "Üretim") return <Package size={size} color={color} />;
                if (route.name === "Analitikler") return <BarChart2 size={size} color={color} />;
              },
              tabBarItemStyle: styles.tabItem,
            })}
          >
            <Tab.Screen name="AnaSayfa" component={HomeScreen} options={{ title: "Ana Sayfa" }} />
            <Tab.Screen name="Üretim" component={UretimEkrani} options={{ title: "Üretim" }} />
            <Tab.Screen name="Analitikler" component={AnalizEkrani} options={{ title: "Analitikler" }} />
            <Tab.Screen name="Admin" component={AdminEkrani} options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }} />
            <Tab.Screen name="Bildirimler" component={BildirimlerEkrani} options={{ tabBarButton: () => null, tabBarItemStyle: { display: "none" } }} />
          </Tab.Navigator>
        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerRight: { flexDirection: "row", gap: 8 },
  menuBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: C.peachLt, justifyContent: "center", alignItems: "center" },
  iconBtn: { width: 32, height: 32, borderRadius: 12, backgroundColor: C.peachLt, justifyContent: "center", alignItems: "center" },
  platformTag: { fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", fontWeight: "600", color: C.muted },
  companyName: { fontSize: 12.5, fontWeight: "800", color: C.text },
  tabBar: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: {
    borderRadius: 16,
    marginHorizontal: 4,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },
});
