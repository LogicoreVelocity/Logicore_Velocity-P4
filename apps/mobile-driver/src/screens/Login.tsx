import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { CONFIG } from "../config";

export default function LoginScreen(props: { onLogin: (token: string) => void }) {
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("driver@logicore.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    try {
      setErr(null);
      setBusy(true);
      const resp = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, email, password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Login failed");
      props.onLogin(data.token);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <Text style={{ color: "#D4AF37", fontSize: 22, fontWeight: "800", marginBottom: 6 }}>Driver Login</Text>
      <Text style={{ color: "#94A3B8", marginBottom: 18 }}>
        Payslips view + Support only. Screenshots are best-effort blocked.
      </Text>

      <Text style={{ color: "#94A3B8", marginBottom: 6 }}>Tenant ID</Text>
      <TextInput
        value={tenantId}
        onChangeText={setTenantId}
        placeholder="Paste tenant_id"
        placeholderTextColor="#64748B"
        style={{ backgroundColor: "#0F2438", color: "#E2E8F0", padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      <Text style={{ color: "#94A3B8", marginBottom: 6 }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        placeholderTextColor="#64748B"
        style={{ backgroundColor: "#0F2438", color: "#E2E8F0", padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      <Text style={{ color: "#94A3B8", marginBottom: 6 }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#64748B"
        style={{ backgroundColor: "#0F2438", color: "#E2E8F0", padding: 12, borderRadius: 10, marginBottom: 12 }}
      />

      {err && <Text style={{ color: "#F87171", marginBottom: 12 }}>{err}</Text>}

      <TouchableOpacity
        onPress={submit}
        disabled={busy || !tenantId}
        style={{ backgroundColor: "#D4AF37", padding: 14, borderRadius: 10, alignItems: "center", opacity: busy || !tenantId ? 0.6 : 1 }}
      >
        <Text style={{ color: "#0B1B2B", fontWeight: "800" }}>{busy ? "Signing in..." : "Sign in"}</Text>
      </TouchableOpacity>
    </View>
  );
}
