import React from "react";
import { View, Text, StatusBar, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Package, BarChart2, Bell, RefreshCw, AlignLeft } from "lucide-react-native";
import { C } from "./constants/colors";
import HomeScreen from "./screens/HomeScreen";
import UretimEkrani from "./screens/UretimEkrani";
import AnalizEkrani from "./screens/AnalizEkrani";

const Tab = createBottomTabNavigator();

function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.menuBtn}>
          <AlignLeft size={16} color={C.peach} />
        </View>
        <View>
          <Text style={styles.platformTag}>JWC Platform</Text>
          <Text style={styles.companyName}>Jiangsu JWC Machinery</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <View style={styles.iconBtn}>
          <Bell size={14} color={C.peach} />
        </View>
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
      <View style={styles.container}>
        <AppHeader />
        <NavigationContainer>
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
          </Tab.Navigator>
        </NavigationContainer>
      </View>
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
    paddingTop: Platform.OS === "android" ? 40 : 12,
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
