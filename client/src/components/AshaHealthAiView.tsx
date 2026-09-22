import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Sparkles,
  Send,
  HeartPulse,
  AlertCircle,
  Users,
  Baby,
  Activity,
  PhoneCall,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface AshaHealthAiViewProps {
  userVillage?: string;
  userDistrict?: string;
  patientsList?: any[];
}

export function AshaHealthAiView({
  userVillage = "Sundarpur",
  userDistrict = "Pune",
  patientsList = [],
}: AshaHealthAiViewProps) {
  const [language, setLanguage] = useState<"mr" | "hi" | "en">("mr");
  const [inputQuery, setInputQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(patientsList[0]?.id);

  const selectedPatient = patientsList.find((p) => p.id === selectedPatientId);

  const [messages, setMessages] = useState<Array<{
    sender: "user" | "ai";
    text: string;
    urgency?: string;
    action?: string;
    time: string;
  }>>([
    {
      sender: "ai",
      text: `नमस्ते! मी **अर्जुन आशा व CHO आरोग्य साथी** (Gemini AI द्वारे समर्थित).
मी तुम्हाला खालील कामांत मदत करू शकते:
१. गरोदर मातांची तपासणी (ANC), आयर्न-फॉलिक गोळ्या व लसीकरण ट्रॅकिंग.
२. उच्च रक्तदाब (BP) व मधुमेह (Sugar) रुग्णांना मराठीत आहाराविषयी समजावून सांगणे.
३. नवजात बालकांच्या धोक्याची लक्षणे ओळखणे व प्राथमिक आरोग्य केंद्रात (PHC) तातडीने पाठवणे.`,
      action: "गावातील गरोदर माता आणि उच्च जोखमीच्या रुग्णांची यादी तपासा.",
      time: "सक्रिय",
    },
  ]);

  const quickPrompts = trpc.aiAssistant.getQuickPrompts.useQuery({ role: "asha", language });

  const aiChat = trpc.aiAssistant.chat.useMutation({
    onSuccess: (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply,
          urgency: data.urgency,
          action: data.recommendedAction,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setInputQuery("");
    },
    onError: (err: any) => toast.error(err.message || "त्रुटी आली, कृपया पुन्हा प्रयत्न करा."),
  });

  const handleSend = (overrideText?: string) => {
    const text = (overrideText || inputQuery).trim();
    if (!text || aiChat.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    aiChat.mutate({
      message: text,
      role: "asha",
      language,
      district: userDistrict,
      patientContext: selectedPatient
        ? {
            name: selectedPatient.name,
            age: selectedPatient.age,
            gender: selectedPatient.gender,
            conditions: selectedPatient.conditions || "None",
            recentVitals: `BP: ${selectedPatient.bpSystolic || 120}/${selectedPatient.bpDiastolic || 80}`,
          }
        : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <Card className="border-0 shadow-xs bg-gradient-to-r from-[#14532d] via-[#166534] to-[#047857] text-white">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-emerald-200 border border-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="display-font text-lg font-bold">ASHA & CHO Health Copilot</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-100 border border-emerald-300/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    Gemini AI
                  </span>
                </div>
                <p className="text-xs text-emerald-100">
                  Field screening guidance, maternal risk triage, & patient counseling scripts in Marathi & Hindi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/15 p-1 rounded-xl border border-white/20 text-xs shrink-0">
              <button
                onClick={() => setLanguage("mr")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${language === "mr" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-100"}`}
              >
                मराठी
              </button>
              <button
                onClick={() => setLanguage("hi")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${language === "hi" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-100"}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${language === "en" ? "bg-white text-emerald-950 shadow-xs" : "text-emerald-100"}`}
              >
                English
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Topic Chips */}
      {quickPrompts.data?.prompts && quickPrompts.data.prompts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
            {language === "mr" ? "नेहमी विचारले जाणारे विषय:" : "Quick Field Prompts:"}
          </span>
          {quickPrompts.data.prompts.map((pt: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSend(pt)}
              disabled={aiChat.isPending}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-2xs"
            >
              {pt}
            </button>
          ))}
        </div>
      )}

      {/* Chat Stream */}
      <Card className="border-0 shadow-xs bg-white flex flex-col h-[520px]">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[88%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#14532d] text-white rounded-br-none shadow-sm"
                    : "bg-[#f0fdf4] text-slate-800 rounded-bl-none border border-emerald-100 shadow-2xs"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.urgency === "emergency" && (
                  <div className="mt-3 rounded-xl bg-red-600 text-white p-3 flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 shrink-0 text-white" />
                      <div>
                        <div className="font-bold text-xs">तात्काळ धोका (Medical Emergency)</div>
                        <div className="text-[10px] text-red-100">१०८ रुग्णवाहिका बोलवा किंवा PHC मध्ये त्वरित हलवा</div>
                      </div>
                    </div>
                    <a href="tel:108" className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-red-700 shadow-2xs">
                      Dial 108
                    </a>
                  </div>
                )}
                {msg.action && (
                  <div className="mt-2.5 rounded-xl bg-white p-2.5 text-emerald-950 font-bold border border-emerald-200 text-[11px] shadow-2xs">
                    मार्गदर्शन / पुढील कृती: {msg.action}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}

          {aiChat.isPending && (
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 w-fit">
              <Sparkles className="h-4 w-4 animate-spin text-emerald-600" />
              <span>Gemini AI आशा मार्गदर्शक तपासत आहे…</span>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="border-t border-slate-100 p-3 bg-slate-50 flex items-center gap-2 rounded-b-2xl">
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              language === "mr"
                ? "गरोदर माता, लसीकरण, बीपी, किंवा आहाराबद्दल प्रश्न विचारा..."
                : language === "hi"
                ? "गर्भवती महिला, टीकाकरण, बीपी या आहार के बारे में पूछें..."
                : "Ask field screening, maternal health, or vaccination questions..."
            }
            className="rounded-full border-slate-200 bg-white text-xs py-5 px-4 shadow-2xs"
          />
          <Button
            onClick={() => handleSend()}
            disabled={aiChat.isPending || !inputQuery.trim()}
            className="rounded-full bg-[#14532d] hover:bg-emerald-900 px-4 text-white transition-colors shrink-0 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
