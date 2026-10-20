import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { apiRequest } from "../api";

type Category = "RIDER_VEHICLE" | "RIDER_CLIENT" | "RIDER_ACCOUNTS";
type Mode = "CALLBACK" | "MESSAGE";

export default function SupportScreen(props: { token: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [category, setCategory] = useState<Category>("RIDER_VEHICLE");
  const [mode, setMode] = useState<Mode>("MESSAGE");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("Support request");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setErr(null);
      const data = await apiRequest(props.token, "/mobile/support/tickets");
      setTickets(data.data || []);
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

  async function createTicket() {
    try {
      setErr(null);
      setMsg(null);
      await apiRequest(props.token, "/mobile/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category, mode, subject, description, notes }),
      });
      setMsg("Ticket created");
      setSubject("");
      setDescription("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
    >
      <Text style={{ color: "#D4AF37", fontSize: 18, fontWeight: "800", marginBottom: 10 }}>Support</Text>
      <Text style={{ color: "#94A3B8", marginBottom: 16 }}>
        Choose category + callback/message. After user marks solved, you will be asked to confirm solved/not solved.
      </Text>

      <View style={{ backgroundColor: "#0F2438", borderRadius: 12, padding: 14, borderColor: "#1f2a37", borderWidth: 1, marginBottom: 14 }}>
        <Text style={{ color: "#E2E8F0", fontWeight: "800", marginBottom: 10 }}>Create Ticket</Text>

        <Text style={{ color: "#94A3B8", marginBottom: 6 }}>Category</Text>
        <Row>
          <Chip active={category==="RIDER_VEHICLE"} label="Vehicle" onPress={() => setCategory("RIDER_VEHICLE")} />
          <Chip active={category==="RIDER_CLIENT"} label="Client" onPress={() => setCategory("RIDER_CLIENT")} />
          <Chip active={category==="RIDER_ACCOUNTS"} label="Accounts" onPress={() => setCategory("RIDER_ACCOUNTS")} />
        </Row>

        <Text style={{ color: "#94A3B8", marginTop: 10, marginBottom: 6 }}>Mode</Text>
        <Row>
          <Chip active={mode==="MESSAGE"} label="Message" onPress={() => setMode("MESSAGE")} />
          <Chip active={mode==="CALLBACK"} label="Callback" onPress={() => setMode("CALLBACK")} />
        </Row>

        <Text style={{ color: "#94A3B8", marginTop: 10, marginBottom: 6 }}>Subject</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Short title"
          placeholderTextColor="#64748B"
          style={{ backgroundColor: "#0B1B2B", color: "#E2E8F0", padding: 12, borderRadius: 10, marginBottom: 10 }}
        />

        <Text style={{ color: "#94A3B8", marginBottom: 6 }}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Explain your issue"
          placeholderTextColor="#64748B"
          multiline
          style={{ backgroundColor: "#0B1B2B", color: "#E2E8F0", padding: 12, borderRadius: 10, marginBottom: 10, minHeight: 80 }}
        />

        <Text style={{ color: "#94A3B8", marginBottom: 6 }}>Notes (required)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Required notes"
          placeholderTextColor="#64748B"
          style={{ backgroundColor: "#0B1B2B", color: "#E2E8F0", padding: 12, borderRadius: 10, marginBottom: 10 }}
        />

        {err && <Text style={{ color: "#F87171", marginBottom: 8 }}>{err}</Text>}
        {msg && <Text style={{ color: "#34D399", marginBottom: 8 }}>{msg}</Text>}

        <TouchableOpacity
          onPress={createTicket}
          disabled={!subject || !description || !notes}
          style={{ backgroundColor: "#D4AF37", padding: 14, borderRadius: 10, alignItems: "center", opacity: (!subject || !description || !notes) ? 0.6 : 1 }}
        >
          <Text style={{ color: "#0B1B2B", fontWeight: "800" }}>Submit</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: "#E2E8F0", fontWeight: "800", marginBottom: 10 }}>My Tickets</Text>
      {!tickets.length && <Text style={{ color: "#94A3B8" }}>No tickets yet.</Text>}

      {tickets.map((t) => (
        <View key={t.id} style={{ backgroundColor: "#0F2438", borderRadius: 12, padding: 14, marginBottom: 10, borderColor: "#1f2a37", borderWidth: 1 }}>
          <Text style={{ color: "#E2E8F0", fontWeight: "800" }}>{t.subject}</Text>
          <Text style={{ color: "#94A3B8", marginTop: 6 }}>{t.category} • {t.mode}</Text>
          <Text style={{ color: t.status === "SOLVED" ? "#34D399" : t.status === "UNSOLVED" ? "#F87171" : "#D4AF37", marginTop: 6, fontWeight: "700" }}>
            {t.status}
          </Text>
          <Text style={{ color: "#64748B", marginTop: 6, fontSize: 12 }}>
            Created: {t.created_at}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Row(props: { children: any }) {
  return <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{props.children}</View>;
}

function Chip(props: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: props.active ? "#D4AF37" : "#334155",
        backgroundColor: props.active ? "rgba(212,175,55,0.15)" : "transparent",
        marginBottom: 6,
      }}
    >
      <Text style={{ color: props.active ? "#D4AF37" : "#94A3B8", fontWeight: "700" }}>{props.label}</Text>
    </TouchableOpacity>
  );
}
