import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Sparkles,
  Send,
  Building2,
  PieChart,
  Package,
  Activity,
  AlertTriangle,
  FileCheck2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface AdminIntelligenceAiViewProps {
  selectedDistrict?: string;
  isSuperAdmin?: boolean;
}

export function AdminIntelligenceAiView({
  selectedDistrict = "all",
  isSuperAdmin = true,
}: AdminIntelligenceAiViewProps) {
  const [inputQuery, setInputQuery] = useState("");
  const [districtFocus, setDistrictFocus] = useState<string>(selectedDistrict);
  const [language, setLanguage] = useState<"en" | "mr" | "hi">("en");

  const [conversation, setConversation] = useState<Array<{
    sender: "user" | "ai";
    text: string;
    action?: string;
    model?: string;
    time: string;
  }>>([
    {
      sender: "ai",
      text: `Welcome to **Arjuna Public Health Intelligence Copilot** (Gemini 3.6 Flash Engine).
I provide state-wide epidemiological tracking, medicine stockout forecasts, and healthcare resource optimization across Maharashtra's 36 districts.

Ask about:
- Seasonal outbreak risks (Dengue/Malaria in Konkan & Vidarbha, Leptospirosis).
- Essential Drug List (EDL) buffer stock requirements & emergency procurement.
- Maternal health indicators (ANC-4 completion rates & referral speed).
- Doctor / CHO deployment density across rural tribal blocks (Gadchiroli, Nandurbar, Palghar).`,
      action: "Review state-wide PHC medicine availability and high-risk case load.",
      time: "Online",
    },
  ]);

  const quickPrompts = trpc.aiAssistant.getQuickPrompts.useQuery({
    role: isSuperAdmin ? "super_admin" : "administrator",
    language: language as any,
  });

  const aiChat = trpc.aiAssistant.chat.useMutation({
    onSuccess: (data: any) => {
      setConversation((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply,
          action: data.recommendedAction,
          model: data.model,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setInputQuery("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to analyze health systems data."),
  });

  const handleSend = (overrideText?: string) => {
    const text = (overrideText || inputQuery).trim();
    if (!text || aiChat.isPending) return;

    setConversation((prev) => [
      ...prev,
      {
        sender: "user",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    aiChat.mutate({
      message: text,
      role: isSuperAdmin ? "super_admin" : "administrator",
      language: language as any,
      district: districtFocus === "all" ? "All Maharashtra Districts" : districtFocus,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <Card className="border-0 shadow-xs bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] text-white">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-cyan-300 border border-white/15">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="display-font text-lg font-bold">Health Systems & Operational AI Copilot</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-bold text-cyan-200 border border-cyan-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse"></span>
                    Gemini 3.6 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Epidemiological intelligence, resource allocation, and essential medicine stockout prevention
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${language === "en" ? "bg-white text-slate-900 shadow-xs" : "text-slate-300"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("mr")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${language === "mr" ? "bg-white text-slate-900 shadow-xs" : "text-slate-300"}`}
                >
                  मराठी
                </button>
                <button
                  onClick={() => setLanguage("hi")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${language === "hi" ? "bg-white text-slate-900 shadow-xs" : "text-slate-300"}`}
                >
                  हिंदी
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Prompts Bar */}
      {quickPrompts.data?.prompts && quickPrompts.data.prompts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Analytical Inquiries:</span>
          {quickPrompts.data.prompts.map((pt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSend(pt)}
              disabled={aiChat.isPending}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-700 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-900 transition-colors shadow-2xs"
            >
              {pt}
            </button>
          ))}
        </div>
      )}

      {/* Chat Stream */}
      <Card className="border-0 shadow-xs bg-white flex flex-col h-[520px]">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#0f172a] text-white rounded-br-none shadow-sm"
                    : "bg-[#f8fafc] text-slate-800 rounded-bl-none border border-slate-200 shadow-2xs"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                      <TrendingUp className="h-3.5 w-3.5 text-cyan-600" />
                      Arjuna Health Intelligence
                    </div>
                    {msg.model && <span className="text-[10px] text-slate-400 font-mono">{msg.model}</span>}
                  </div>
                )}
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.action && (
                  <div className="mt-3 rounded-xl bg-cyan-50 p-2.5 text-cyan-950 font-bold border border-cyan-200 text-[11px] shadow-2xs">
                    Administrative Directive: {msg.action}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}

          {aiChat.isPending && (
            <div className="flex items-center gap-2 text-xs text-cyan-800 bg-cyan-50 p-3 rounded-xl border border-cyan-200 w-fit">
              <Sparkles className="h-4 w-4 animate-spin text-cyan-600" />
              <span>Analyzing district health indicators & epidemiological patterns with Gemini…</span>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="border-t border-slate-100 p-3 bg-slate-50 flex items-center gap-2 rounded-b-2xl">
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about district epidemic trends, drug stockout forecasting, or PHC staffing optimization..."
            className="rounded-full border-slate-200 bg-white text-xs py-5 px-4 shadow-2xs"
          />
          <Button
            onClick={() => handleSend()}
            disabled={aiChat.isPending || !inputQuery.trim()}
            className="rounded-full bg-[#0f172a] hover:bg-slate-800 px-4 text-white transition-colors shrink-0 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
