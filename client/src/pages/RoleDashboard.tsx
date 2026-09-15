import { useAuth } from "@/_core/hooks/useAuth";
import SupabaseAuthPortal from "@/components/SupabaseAuthPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Activity, ClipboardCheck, HeartPulse, LogOut, Package, ShieldCheck, Users } from "lucide-react";
import { useLocation, useRoute } from "wouter";

const roleNames: Record<string, string> = {
  citizen: "Citizen",
  asha: "ASHA Worker",
  cho: "Community Health Officer (CHO)",
  asha_cho: "ASHA / CHO worker",
  doctor: "Doctor",
  facility_staff: "Facility staff",
  administrator: "Administrator",
  admin: "Administrator",
};

const roleContent: Record<string, { eyebrow: string; title: string; description: string; tone: string; nav: string[]; actions: string[] }> = {
  citizen: { eyebrow: "Citizen dashboard", title: "Your care plan, in one place.", description: "Review your linked records, upcoming follow-ups, and safety-net guidance without the noise of a clinical worklist.", tone: "bg-[#e4f1f8]", nav: ["My care plan", "Health history", "Follow-ups", "Messages"], actions: ["View my care plan", "Review next follow-up"] },
  asha: { eyebrow: "ASHA dashboard", title: "Village care rounds.", description: "Register households, capture structured visits, and keep field follow-ups moving—even when connectivity is limited.", tone: "bg-[#e8f3ed]", nav: ["My households", "Field visits", "Follow-ups", "Offline queue"], actions: ["Register household", "Document field visit"] },
  cho: { eyebrow: "CHO dashboard", title: "Comprehensive primary care.", description: "Screen patients, assess risk factors, coordinate referrals, and conduct community wellness follow-ups.", tone: "bg-[#e8f3ed]", nav: ["Screening queue", "Field visits", "Referrals", "Follow-ups"], actions: ["Record visit", "Review follow-ups"] },
  asha_cho: { eyebrow: "ASHA / CHO dashboard", title: "Village care rounds.", description: "Register households, capture structured visits, and keep field follow-ups moving—even when connectivity is limited.", tone: "bg-[#e8f3ed]", nav: ["My households", "Field visits", "Follow-ups", "Offline queue"], actions: ["Register household", "Document field visit"] },
  doctor: { eyebrow: "Doctor dashboard", title: "Clinical review desk.", description: "Prioritize risk signals, document clinical visits, and close referral loops with decision support clearly labelled as non-diagnostic.", tone: "bg-[#f8e7e8]", nav: ["Risk queue", "Clinical history", "Referrals", "Triage support"], actions: ["Review high-risk cases", "Create referral"] },
  facility_staff: { eyebrow: "Facility staff dashboard", title: "Facility operations.", description: "Coordinate referrals, monitor medicine stock, and keep the facility care queue visible to the team.", tone: "bg-[#fff4da]", nav: ["Facility queue", "Referrals", "Medicine stock", "Facility reports"], actions: ["Review facility queue", "Check low stock"] },
  administrator: { eyebrow: "Administrator dashboard", title: "District oversight.", description: "See cross-facility caseload, risk distribution, referral flow, follow-ups, and stock signals from one governance view.", tone: "bg-[#e4f1f8]", nav: ["District overview", "Facilities", "Risk distribution", "Reports"], actions: ["Open district insights", "Review facility signals"] },
};

export default function RoleDashboard({ fixedRole }: { fixedRole?: string; params?: object } = {}) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, params] = useRoute("/dashboard/:role");
  const [, setLocation] = useLocation();
  const role = fixedRole ?? params?.role ?? user?.role ?? "citizen";
  const content = roleContent[role] ?? roleContent.citizen;
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated });
  const metrics = overview.data?.metrics ?? { patients: 0, highRisk: 0, referrals: 0, openFollowUps: 0, overdueFollowUps: 0, lowStock: 0, facilities: 0 };

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#f3f5f7]"><Activity className="h-5 w-5 animate-pulse text-slate-500" /></div>;
  if (!isAuthenticated) return <SupabaseAuthPortal />;

  const goToWorkspace = () => setLocation("/workspace");

  return <div className="min-h-screen overflow-hidden bg-[#f3f5f7] text-[#15181b]"><div className="pointer-events-none fixed -right-16 -top-20 h-64 w-64 rounded-[38%] bg-[#dcecf6] opacity-80" /><div className="pointer-events-none fixed -bottom-20 -left-16 h-72 w-72 rounded-[42%] bg-[#f8e0e4] opacity-65" /><div className="relative mx-auto flex min-h-screen max-w-[1500px]"><aside className="hidden w-72 shrink-0 flex-col border-r border-black/5 bg-[#f7f8f9]/80 px-5 py-6 lg:flex"><div className="flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#15181b] text-white"><HeartPulse className="h-5 w-5" /></div><div><p className="display-font text-base font-extrabold">Arjuna</p><p className="text-[11px] text-slate-500">{roleNames[role]} workspace</p></div></div><p className="subtle-label mt-12 px-3">{content.eyebrow}</p><nav className="mt-3 space-y-1">{content.nav.map((item, index) => <button key={item} onClick={goToWorkspace} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${index === 0 ? "bg-white shadow-sm" : "text-slate-500 hover:bg-white/70"}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eef2f4]"><Users className="h-4 w-4" /></span>{item}</button>)}</nav><div className="mt-auto rounded-2xl bg-[#e6f1f7] p-4"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Safe by design</div><p className="mt-2 text-xs leading-5 text-slate-600">Decision support helps care teams notice signals. It never replaces clinical judgement.</p></div></aside><main className="min-w-0 flex-1 px-4 py-5 sm:px-8 lg:px-12 lg:py-8"><header className="flex items-center justify-between gap-4"><div><p className="subtle-label">Separate role workspace</p><h1 className="display-font mt-2 text-3xl font-extrabold sm:text-4xl">{content.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{content.description}</p></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:inline-flex">{roleNames[role]}</span><Button variant="ghost" size="icon" onClick={() => logout()} className="rounded-full"><LogOut className="h-5 w-5" /></Button></div></header><Card className={`mt-8 border-0 shadow-none ${content.tone}`}><CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="subtle-label">{content.eyebrow}</p><h2 className="display-font mt-2 text-2xl font-extrabold">A focused starting point for your work.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Choose a primary action below or open the full care coordination workspace when you need the complete record view.</p></div><div className="grid gap-2 sm:min-w-64">{content.actions.map(action => <Button key={action} onClick={goToWorkspace} variant="outline" className="justify-between rounded-full bg-white text-left">{action}<ArrowRight className="h-4 w-4" /></Button>)}</div></CardContent></Card><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="People in care" value={metrics.patients} icon={<Users className="h-4 w-4" />} /><Metric label="Risk signals" value={metrics.highRisk} icon={<Activity className="h-4 w-4" />} /><Metric label="Referrals" value={metrics.referrals} icon={<ArrowRight className="h-4 w-4" />} /><Metric label="Follow-ups" value={metrics.openFollowUps} icon={<ClipboardCheck className="h-4 w-4" />} /></div><div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_.75fr]"><Card className="border-0 shadow-sm"><CardContent className="p-6"><p className="subtle-label">Workspace handoff</p><h3 className="display-font mt-2 text-2xl font-extrabold">Open the full coordination workspace.</h3><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Access records, triage, referrals, follow-ups, inventory, and district analytics using your role permissions.</p><Button onClick={goToWorkspace} className="mt-6 rounded-full bg-[#15181b] text-white">Open care workspace <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card><Card className="border-0 bg-[#171b1e] text-white shadow-sm"><CardContent className="p-6"><Package className="h-5 w-5 text-[#a9d1e8]" /><p className="subtle-label mt-6 text-slate-400">Decision support</p><h3 className="display-font mt-2 text-xl font-extrabold">Not a diagnosis.</h3><p className="mt-3 text-sm leading-6 text-slate-300">Triage summaries surface urgency and safety-net guidance for human review.</p></CardContent></Card></div></main></div></div>;
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <Card className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex items-center justify-between text-slate-500"><span className="subtle-label">{label}</span>{icon}</div><p className="display-font mt-5 text-4xl font-extrabold">{value}</p></CardContent></Card>; }
