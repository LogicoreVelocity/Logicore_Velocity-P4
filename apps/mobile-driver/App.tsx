import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, Text, View, TouchableOpacity } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import LoginScreen from "./src/screens/Login";
import PayslipsScreen from "./src/screens/Payslips";
import SupportScreen from "./src/screens/Support";

type Tab = "PAYSLIPS" | "SUPPORT";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("PAYSLIPS");

  useEffect(() => {
    (async () => {
      // Best-effort screenshot prevention
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch {
        // ignore
      }

      const stored = await SecureStore.getItemAsync("lv_driver_token");
      if (stored) setToken(stored);
    })();
  }, []);

  async function handleLogin(newToken: string) {
    setToken(newToken);
    await SecureStore.setItemAsync("lv_driver_token", newToken);
  }

  async function handleLogout() {
    setToken(null);
    await SecureStore.deleteItemAsync("lv_driver_token");
  }

  if (!token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1B2B" }}>
        <LoginScreen onLogin={handleLogin} />
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1B2B" }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#1f2a37" }}>
        <Text style={{ color: "#D4AF37", fontSize: 18, fontWeight: "700" }}>Logicore Velocity</Text>
        <Text style={{ color: "#94A3B8", marginTop: 4 }}>Driver App (limited access)</Text>
      </View>

      <View style={{ flex: 1 }}>
        {tab === "PAYSLIPS" ? (
          <PayslipsScreen token={token} />
        ) : (
          <SupportScreen token={token} />
        )}
      </View>

      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1f2a37" }}>
        <TabButton active={tab === "PAYSLIPS"} label="Payslips" onPress={() => setTab("PAYSLIPS")} />
        <TabButton active={tab === "SUPPORT"} label="Support" onPress={() => setTab("SUPPORT")} />
        <TabButton active={false} label="Logout" onPress={handleLogout} />
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

function TabButton(props: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={{
        flex: 1,
        paddingVertical: 14,
        backgroundColor: props.active ? "#0F2438" : "#0B1B2B",
        alignItems: "center",
      }}
    >
      <Text style={{ color: props.active ? "#D4AF37" : "#94A3B8", fontWeight: "600" }}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}
