import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { apiRequest } from "../api";

export default function PayslipsScreen(props: { token: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setErr(null);
      const data = await apiRequest(props.token, "/mobile/payslips");
      setRows(data.data || []);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <Text style={{ color: "#D4AF37", fontSize: 18, fontWeight: "800", marginBottom: 10 }}>Payslips</Text>
      <Text style={{ color: "#94A3B8", marginBottom: 16 }}>
        View only. No download. Screenshot prevention is best-effort.
      </Text>

      {err && <Text style={{ color: "#F87171", marginBottom: 10 }}>{err}</Text>}
      {!rows.length && !err && <Text style={{ color: "#94A3B8" }}>No payslips yet.</Text>}

      {rows.map((p) => (
        <View key={p.id} style={{ backgroundColor: "#0F2438", borderRadius: 12, padding: 14, marginBottom: 10, borderColor: "#1f2a37", borderWidth: 1 }}>
          <Text style={{ color: "#E2E8F0", fontWeight: "800" }}>
            {p.period_start} → {p.period_end}
          </Text>
          <Text style={{ color: "#94A3B8", marginTop: 6 }}>
            Payables: AED {p.total_payables} | Receivables: AED {p.total_receivables}
          </Text>
          <Text style={{ color: "#D4AF37", marginTop: 6, fontWeight: "800" }}>
            Net Pay: AED {p.net_pay}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
