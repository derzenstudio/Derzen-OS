import { useState } from "react";
import { cx, money, timeAgo, fmtDateTime, download, toCSV } from "../lib/format";
import { fxInfo } from "../lib/fx";
import { Ic } from "../components/icons";
import { Avatar, Badge, Btn, Dot, Field, Input, Modal, Select, Tabs, Textarea, Toggle } from "../components/ui";
import { useApp } from "../store";
import { GATEWAYS, MEMBERS, NOTIF_CHANNELS, NOTIF_EVENTS, SERVICES, WORKSPACE, propertyById } from "../lib/data";

export default function SettingsModule() {
  const [tab, setTab] = useState("profile");
  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "profile", label: "Profile" }, { id: "team", label: "Team" }, { id: "general", label: "General" },
          { id: "company", label: "Company" }, { id: "billing", label: "Billing" }, { id: "transactions", label: "Transactions" },
          { id: "direct", label: "Direct booking" }, { id: "reminders", label: "Task reminders" }, { id: "notifications", label: "Notifications" },
        ]}
        active={tab} onChange={setTab}
      />
      {tab === "profile" && <Profile />}
      {tab === "team" && <Team />}
      {tab === "general" && <General />}
      {tab === "company" && <Company />}
      {tab === "billing" && <Billing />}
      {tab === "transactions" && <Transactions />}
      {tab === "direct" && <Direct />}
      {tab === "reminders" && <Reminders />}
      {tab === "notifications" && <Notifications />}
    </div>
  );
}

function Profile() {
  const { toast } = useApp();
  const [pw, setPw] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [twoFA, setTwoFA] = useState(true);
  const strength = pw.length === 0 ? 0 : pw.length < 8 ? 1 : pw.length < 12 ? 2 : /[A-Z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw) ? 4 : 3;
  const strengthLabel = ["", "Too short", "Weak", "Good", "Strong"][strength];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <Avatar name="Sarah Whitfield" size={46} />
          <div><p className="text-[14px] font-bold text-ink">Sarah Whitfield</p><p className="text-[11px] text-mute">Account owner · joined 2023</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"><Input defaultValue="Sarah Whitfield" /></Field>
          <Field label="Preferred language"><Select defaultValue="en"><option value="en">English</option><option value="id">Bahasa Indonesia</option><option value="fr">Français (partial)</option></Select></Field>
        </div>
        <Field label="Email" hint="Changes go through support to protect account recovery.">
          <div className="flex gap-2"><Input defaultValue="sarah@sanggraha.co" className="flex-1" /><Btn size="sm" onClick={() => toast("info", "Change request sent to support", "You'll get a confirmation email at the new address.")}>Request change</Btn></div>
        </Field>
        <Field label="Phone · WhatsApp verification">
          <div className="flex gap-2">
            <Input defaultValue="+62 812 390 110" className="flex-1" />
            {!otpSent ? <Btn size="sm" icon="whatsapp" onClick={() => { setOtpSent(true); toast("ok", "One-time code sent via WhatsApp"); }}>Verify</Btn> : <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" className="!w-[120px]" />}
            {otpSent && <Btn size="sm" variant="solid" icon="check" onClick={() => { if (otp.length === 6) toast("ok", "WhatsApp verified", "Task reminders can now reach you."); else toast("err", "Enter the 6-digit code"); }}>Confirm</Btn>}
          </div>
        </Field>
        <Field label="Timezone"><Select defaultValue="Europe/Amsterdam"><option>Europe/Amsterdam (workspace)</option><option>Asia/Makassar (WITA)</option><option>Asia/Jakarta (WIB)</option></Select></Field>
      </div>
      <div className="space-y-4">
        <div className="space-y-3 rounded-xl border border-line bg-card p-4">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Password</h3>
          <Field label="New password" hint="Policy: ≥12 characters, upper + lower + number + symbol.">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••••••" />
          </Field>
          <div className="flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1 overflow-hidden">
              {[1, 2, 3, 4].map((i) => <div key={i} className={cx("h-full flex-1 rounded-full transition-colors duration-300", strength >= i ? (strength <= 1 ? "bg-danger" : strength === 2 ? "bg-gold" : "bg-brand") : "bg-line")} />)}
            </div>
            <span className={cx("text-[10.5px] font-bold", strength <= 1 ? "text-danger" : strength === 2 ? "text-[#8a5c07]" : "text-brand-deep")}>{strengthLabel}</span>
          </div>
          <Btn variant="solid" size="sm" disabled={strength < 3} onClick={() => { toast("ok", "Password updated", "All other sessions signed out."); setPw(""); }}>Update password</Btn>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-[13.5px] font-bold text-ink">Two-factor authentication</h3>
              <p className="text-[11px] text-mute">Authenticator app · recovery codes stored encrypted.</p>
            </div>
            <Toggle checked={twoFA} onChange={(v) => { setTwoFA(v); toast(v ? "ok" : "warn", v ? "2FA enabled" : "2FA disabled", v ? undefined : "Your account is less protected without 2FA."); }} label="Two-factor authentication" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Team() {
  const { toast } = useApp();
  const [filter, setFilter] = useState("all");
  const [matrixOpen, setMatrixOpen] = useState(false);
  const list = MEMBERS.filter((m) =>
    filter === "all" ? true : filter === "pending" ? m.pending : filter === "workforce" ? m.duty !== "none" : filter === "owners" ? m.role === "property_owner" || m.role === "owner" : true,
  );
  const ROLES = ["Account owner", "Administrator", "Account manager", "Booking coordinator", "Property owner", "Staff"];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5">
          <Input placeholder="Invite by email…" className="!h-7 !w-[210px] !border-0 !bg-transparent" />
          <Select defaultValue="staff" className="!h-7 !w-[150px] !text-[11px]" aria-label="Role for invite">
            {ROLES.slice(1).map((r) => <option key={r} value={r.toLowerCase()}>{r}</option>)}
          </Select>
          <Btn size="xs" variant="solid" icon="userPlus" onClick={() => toast("ok", "Invite sent", "They'll choose a password and their workforce duties on first login.")}>Invite</Btn>
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="!w-[170px]" aria-label="Team filter">
          <option value="all">Platform access — all</option><option value="workforce">Workforce</option><option value="owners">Owners</option><option value="pending">Pending invites</option>
        </Select>
        <Btn className="ml-auto" icon="shield" onClick={() => setMatrixOpen(true)}>Permission matrix</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[860px] text-left">
          <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
            <th className="px-4 py-2.5">Member</th><th className="px-3 py-2.5">Platform role</th><th className="px-3 py-2.5">Workforce duty</th><th className="px-3 py-2.5">Property scope</th><th className="px-3 py-2.5">Status</th>
          </tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-b border-line/60 hover:bg-paper/70">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} color={m.color} size={30} />
                    <div><p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">{m.name} {m.isYou && <Badge tone="ok">you</Badge>}</p><p className="text-[10.5px] text-mute">{m.email}</p></div>
                  </div>
                </td>
                <td className="px-3 py-2.5"><Badge tone={m.role === "owner" ? "ink" : m.role === "admin" ? "plum" : m.role === "property_owner" ? "warn" : "mute"}>{m.role.replace("_", " ")}</Badge></td>
                <td className="px-3 py-2.5 text-[11.5px] font-semibold text-mute">{m.duty === "none" ? "—" : m.duty.replace("_", " + ")}</td>
                <td className="px-3 py-2.5 text-[11px] font-semibold text-mute">{m.propertyIds.length === 0 ? "All properties" : m.propertyIds.map((p) => propertyById(p).code).join(", ")}</td>
                <td className="px-3 py-2.5">{m.pending ? <Dot tone="warn" label="invite pending" /> : <Dot tone="ok" label="active" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={matrixOpen} onClose={() => setMatrixOpen(false)} title="Permission matrix — checked server-side on every endpoint" w={640}>
        <table className="w-full text-left">
          <thead><tr className="border-b border-line text-[9.5px] font-bold uppercase text-mute"><th className="py-1.5 pr-2">Capability</th>{ROLES.map((r) => <th key={r} className="px-1 py-1.5 text-center">{r.split(" ")[0]}</th>)}</tr></thead>
          <tbody>
            {[
              ["Edit rates & calendar", [1, 1, 1, 1, 0, 0]],
              ["Reply to guests", [1, 1, 1, 1, 0, 1]],
              ["Manage channels", [1, 1, 1, 0, 0, 0]],
              ["See financials", [1, 1, 1, 0, 2, 0]],
              ["Execute tasks", [1, 1, 1, 1, 0, 1]],
              ["Manage team & billing", [1, 1, 0, 0, 0, 0]],
            ].map(([cap, marks]) => (
              <tr key={String(cap)} className="border-b border-line/50">
                <td className="py-1.5 pr-2 text-[11.5px] font-semibold">{cap}</td>
                {(marks as number[]).map((mk, i) => (
                  <td key={i} className="px-1 py-1.5 text-center">
                    {mk === 1 ? <Ic name="check" size={12} className="mx-auto text-brand" /> : mk === 2 ? <span className="text-[8.5px] font-bold text-[#8a5c07]">own only</span> : <span className="text-line2">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 rounded-md bg-paper px-3 py-2 text-[10.5px] text-mute">Owners never see another owner's financials · the workspace “owner financials” switch overrides the column above. Staff roles are further scoped per property.</p>
      </Modal>
    </div>
  );
}

function General() {
  const { toast } = useApp();
  const [support, setSupport] = useState(WORKSPACE.supportAccess);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Workspace</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Workspace name"><Input defaultValue={WORKSPACE.name} /></Field>
          <Field label="Country"><Select defaultValue="Indonesia"><option>Indonesia</option><option>Netherlands</option><option>Australia</option></Select></Field>
          <Field label="Reporting currency" hint="Dashboards roll up here at timestamped FX rates. Listing & channel currencies stay separate.">
            <ReportingCurrencyControl />
          </Field>
          <Field label="Workspace timezone"><Select defaultValue="Europe/Amsterdam"><option>Europe/Amsterdam</option><option>Asia/Makassar</option></Select></Field>
          <Field label="Date format"><Select defaultValue="D MMM YYYY"><option>D MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></Select></Field>
          <Field label="Time format"><Select defaultValue="24h"><option>24h</option><option>12h</option></Select></Field>
        </div>
        <Field label="Week starts on"><Select defaultValue="Monday"><option>Monday</option><option>Sunday</option></Select></Field>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-gold/50 bg-card p-4">
          <div className="flex items-start gap-3">
            <Ic name="shield" size={18} className="mt-0.5 text-[#8a5c07]" />
            <div className="flex-1">
              <h3 className="font-display text-[13.5px] font-bold text-ink">Support access</h3>
              <p className="text-[11.5px] text-mute">Lets the DERZEN team troubleshoot your account. Every session is logged and visible.</p>
              <p className="mt-1.5 text-[11px] font-bold text-mute">Last accessed: {timeAgo(WORKSPACE.supportLastAccess)} · agent Mira K. · 12 min</p>
              <div className="mt-2 flex items-center gap-3">
                <Toggle checked={support} onChange={(v) => { setSupport(v); toast(v ? "ok" : "warn", v ? "Support access granted" : "Support access revoked instantly"); }} label="Support access" />
                {!support && <Btn size="xs" variant="danger" icon="lock" onClick={() => toast("ok", "All active support sessions terminated")}>Revoke now</Btn>}
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Owner portal</h3>
          <label className="mt-2 flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
            <span className="text-[12.5px] font-bold text-ink">Owners can see financial figures</span>
            <Toggle checked={WORKSPACE.ownerFinancialsVisible} onChange={() => toast("info", "Saved", "Applies to every owner login immediately.")} label="Owner financial visibility" />
          </label>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Provider invoice inbox</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-paper px-2.5 py-2 font-mono text-[11px] text-mute">{WORKSPACE.inboundEmail}</code>
            <Btn size="xs" icon="copy" onClick={() => toast("ok", "Copied")}>Copy</Btn>
          </div>
        </div>
        <TenantFonts />
      </div>
    </div>
  );
}

function TenantFonts() {
  const { session, tenantFonts, setTenantFonts, toast } = useApp();
  const tenantId = session?.kind === "tenant" ? session.tenantId : "t-sanggraha";
  const saved = tenantFonts[tenantId] ?? { headingUrl: "", headingFamily: "", bodyUrl: "", bodyFamily: "" };
  const [headingUrl, setHeadingUrl] = useState(saved.headingUrl);
  const [headingFamily, setHeadingFamily] = useState(saved.headingFamily);
  const [bodyUrl, setBodyUrl] = useState(saved.bodyUrl);
  const [bodyFamily, setBodyFamily] = useState(saved.bodyFamily);

  const apply = () => {
    setTenantFonts(tenantId, { headingUrl, headingFamily, bodyUrl, bodyFamily });
    toast("ok", "Brand fonts applied", "Every heading and body text across your workspace now uses them.");
  };
  const reset = () => {
    setTenantFonts(tenantId, { headingUrl: "", headingFamily: "", bodyUrl: "", bodyFamily: "" });
    setHeadingUrl(""); setHeadingFamily(""); setBodyUrl(""); setBodyFamily("");
    toast("info", "Reverted to DERZEN type", "Big Shoulders Display + Schibsted Grotesk.");
  };

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h3 className="font-display text-[13.5px] font-bold text-ink">Brand typography</h3>
      <p className="mb-3 text-[11px] leading-relaxed text-mute">
        Paste a CSS link (Google Fonts, Adobe, or your own stylesheet) and a family name — applied globally to your headings and body text.
      </p>
      <div className="space-y-3">
        <Field label="Heading font — CSS URL" hint="e.g. https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&display=swap">
          <Input value={headingUrl} onChange={(e) => setHeadingUrl(e.target.value)} placeholder="https://…/css2?family=…" className="font-mono !text-[11px]" />
        </Field>
        <Field label="Heading family name">
          <Input value={headingFamily} onChange={(e) => setHeadingFamily(e.target.value)} placeholder="Fraunces" />
        </Field>
        <Field label="Body font — CSS URL">
          <Input value={bodyUrl} onChange={(e) => setBodyUrl(e.target.value)} placeholder="https://…/css2?family=…" className="font-mono !text-[11px]" />
        </Field>
        <Field label="Body family name">
          <Input value={bodyFamily} onChange={(e) => setBodyFamily(e.target.value)} placeholder="Public Sans" />
        </Field>
      </div>
      <div className="mt-3 rounded-sm border border-line bg-paper px-3 py-2.5" style={{ fontFamily: bodyFamily || undefined }}>
        <p className="text-[15px] font-bold" style={{ fontFamily: headingFamily || undefined }}>{headingFamily || "Your heading font"} — preview</p>
        <p className="mt-0.5 text-[11.5px] text-mute">{bodyFamily || "Your body font"} renders here across dashboards, inbox and reports.</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Btn size="sm" variant="solid" icon="check" onClick={apply}>Apply fonts</Btn>
        <Btn size="sm" variant="ghost" icon="undo" onClick={reset}>Reset</Btn>
      </div>
    </div>
  );
}

function Company() {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-card p-4">
      <p className="text-[11px] text-mute">Used on invoices, owner statements and for tax compliance.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Field label="Business type"><Select defaultValue="PT (limited liability)"><option>PT (limited liability)</option><option>Sole trader</option><option>Partnership</option></Select></Field>
        <Field label="Legal name"><Input defaultValue="PT Sanggraha Hospitality" /></Field>
        <Field label="Trading name"><Input defaultValue="Sanggraha Villas" /></Field>
        <Field label="Registration number"><Input defaultValue="AHU-0042178.AH.01.01.2019" /></Field>
        <Field label="Tax ID / NPWP"><Input defaultValue="84.221.773.8-903.000" /></Field>
        <Field label="VAT number"><Input placeholder="if applicable" /></Field>
        <Field label="Business category"><Select defaultValue="Short-term rental operator"><option>Short-term rental operator</option><option>Boutique hotel</option><option>Property manager</option></Select></Field>
        <Field label="Year established"><Input defaultValue="2019" /></Field>
        <Field label="Bank account country"><Select defaultValue="Indonesia"><option>Indonesia</option><option>Netherlands</option><option>Singapore</option></Select></Field>
      </div>
      <Field label="Business address"><Input defaultValue="Jl. Pantai Berawa No. 12, Canggu, Bali 80361, Indonesia" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Support contact"><Input defaultValue="ops@sanggraha.co" /></Field>
        <Field label="Billing contact"><Input defaultValue="finance@sanggraha.co" /></Field>
      </div>
    </div>
  );
}

function Billing() {
  const { toast } = useApp();
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const propUnits = useApp((s) => s.properties).filter((p) => !p.archived).length;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-line bg-card p-4 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-[13.5px] font-bold text-ink">Plan — {WORKSPACE.plan}</h3>
          <div className="flex items-center rounded-lg border border-line bg-paper p-0.5">
            <button onClick={() => setCycle("monthly")} className={cx("rounded-md px-2.5 py-1 text-[11px] font-bold", cycle === "monthly" ? "bg-pine-900 text-white" : "text-mute")}>Monthly</button>
            <button onClick={() => setCycle("annual")} className={cx("rounded-md px-2.5 py-1 text-[11px] font-bold", cycle === "annual" ? "bg-pine-900 text-white" : "text-mute")}>Annual · −20%</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-paper p-3">
            <p className="text-[10px] font-bold uppercase text-mute">Active property units</p>
            <p className="font-display text-[22px] font-bold text-ink">{propUnits}</p>
            <p className="text-[10.5px] text-mute">metered separately from services</p>
          </div>
          <div className="rounded-lg bg-paper p-3">
            <p className="text-[10px] font-bold uppercase text-mute">Active service units</p>
            <p className="font-display text-[22px] font-bold text-ink">{SERVICES.filter((s) => s.active).length}</p>
            <p className="text-[10.5px] text-mute">only services with checkout enabled</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-gold/60 bg-gold-soft/60 p-3">
          <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#8a5c07]"><Ic name="alertTri" size={14} /> Trial ends in {WORKSPACE.trialEndsInDays} days</p>
          <p className="mt-0.5 text-[11px] text-[#8a5c07]">Add a payment method to keep your channels syncing — nothing is deleted, but distribution pauses at the gate.</p>
          <Btn size="sm" variant="gold" className="mt-2" icon="card" onClick={() => toast("ok", "Payment method added", "Trial converted — you're covered through the end of the cycle.")}>Add payment method to continue</Btn>
        </div>
        <div className="mt-3 flex gap-2">
          <Btn icon="external" onClick={() => toast("info", "Opening customer portal", "Handoff to the payment processor — cards never touch our servers.")}>Customer portal</Btn>
          <Btn variant="ghost" icon="trendUp" onClick={() => toast("info", "Plan change", "Scale tier pro-rates instantly.")}>Change plan</Btn>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Invoice history</h3>
        {[["INV-2024-041", "€118.00", "paid", -3], ["INV-2024-040", "€112.00", "paid", -33], ["INV-2024-039", "€104.00", "paid", -63]].map(([ref, amt, st, d]) => (
          <div key={ref} className="mb-1.5 flex items-center gap-2 rounded-lg border border-line px-2.5 py-2">
            <Ic name="receipt" size={13} className="text-mute" />
            <span className="font-mono text-[11px] font-bold">{ref}</span>
            <span className="text-[10.5px] text-faint">{timeAgo(Date.now() + Number(d) * 86_400_000)}</span>
            <span className="ml-auto font-mono text-[11px] font-bold">{amt}</span>
            <Badge tone="ok">{st}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function Transactions() {
  const { toast } = useApp();
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = [
    { id: "tx-1", ts: Date.now() - 5 * 3_600_000, ref: "R-2418", desc: "Booking.com · Jonas Weber", method: "OTA-collected", amount: 612_00, currency: "EUR", status: "succeeded" },
    { id: "tx-2", ts: Date.now() - 9 * 3_600_000, ref: "R-2423", desc: "Direct · Grace Lin (deposit 30%)", method: "Gateway (Stripe)", amount: 402_00, currency: "EUR", status: "succeeded" },
    { id: "tx-3", ts: Date.now() - 26 * 3_600_000, ref: "R-2419", desc: "Direct · Sofia Marques (deposit)", method: "Gateway (Stripe)", amount: 208_00, currency: "EUR", status: "succeeded" },
    { id: "tx-4", ts: Date.now() - 2 * 86_400_000, ref: "R-2432", desc: "Refund · VRBO cancellation", method: "Gateway (Stripe)", amount: -355_00, currency: "USD", status: "refunded" },
    { id: "tx-5", ts: Date.now() - 3 * 86_400_000, ref: "R-2425", desc: "Trip.com · Chen Wei", method: "OTA-collected", amount: 1204_00, currency: "USD", status: "succeeded" },
    { id: "tx-6", ts: Date.now() - 4 * 86_400_000, ref: "ST-5", desc: "Store · late checkout", method: "Gateway (Stripe)", amount: 350_000, currency: "IDR", status: "failed" },
    { id: "tx-7", ts: Date.now() - 5 * 86_400_000, ref: "R-2417", desc: "Airbnb · Amelia Hartono", method: "OTA-collected", amount: 1690_00, currency: "USD", status: "payout_processed" },
  ];
  const list = rows.filter((r) => (method === "all" || r.method.includes(method)) && (status === "all" || r.status === status));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={method} onChange={(e) => setMethod(e.target.value)} className="!w-[180px]" aria-label="Method filter">
          <option value="all">All methods</option><option value="Gateway">Gateway</option><option value="OTA">OTA-collected</option><option value="Bank">Bank transfer</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="!w-[160px]" aria-label="Status filter">
          <option value="all">All statuses</option><option value="succeeded">Succeeded</option><option value="refunded">Refunded</option><option value="failed">Failed</option><option value="payout">Payout processed</option>
        </Select>
        <Btn className="ml-auto" icon="download" onClick={() => { download("derzen-transactions.csv", toCSV([["Time", "Ref", "Description", "Method", "Amount", "Currency", "Status"], ...list.map((r) => [fmtDateTime(r.ts), r.ref, r.desc, r.method, r.amount, r.currency, r.status])])); toast("ok", "Exported"); }}>Export</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[780px] text-left">
          <thead><tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
            <th className="px-4 py-2.5">Time</th><th className="px-3 py-2.5">Ref</th><th className="px-3 py-2.5">Description</th><th className="px-3 py-2.5">Method</th><th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Status</th>
          </tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b border-line/60 hover:bg-paper/70">
                <td className="px-4 py-2 font-mono text-[11px] text-mute">{fmtDateTime(r.ts)}</td>
                <td className="px-3 py-2 font-mono text-[11.5px] font-bold">{r.ref}</td>
                <td className="px-3 py-2 text-[12px] font-semibold">{r.desc}</td>
                <td className="px-3 py-2 text-[11.5px] text-mute">{r.method}</td>
                <td className={cx("px-3 py-2 text-right font-mono text-[12px] font-bold", r.amount < 0 && "text-danger")}>{money(r.amount, r.currency, { sign: true })}</td>
                <td className="px-3 py-2"><Dot tone={r.status === "succeeded" || r.status === "payout_processed" ? "ok" : r.status === "failed" ? "danger" : "warn"} label={r.status.replace("_", " ")} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Direct() {
  const { toast } = useApp();
  const [policies, setPolicies] = useState([
    { id: "pol-1", text: "Flexible — full refund >14d, 50% 7–14d", isDefault: true },
    { id: "pol-2", text: "Moderate — 50% >30d, 25% 7–30d", isDefault: false },
    { id: "pol-3", text: "Strict — deposit non-refundable", isDefault: false },
  ]);
  const [editingPolicy, setEditingPolicy] = useState<typeof policies[number] | null>(null);
  const [policyDraft, setPolicyDraft] = useState("");
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Host profile & guest contact channels</h3>
        <Field label="Display name"><Input defaultValue="Sanggraha Villas Guest Team" /></Field>
        {[["WhatsApp", true, "Shown"], ["Email", true, "Shown"], ["Phone", false, "Hidden"]].map(([ch, on, vis]) => (
          <label key={String(ch)} className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
            <span className="flex items-center gap-2 text-[12.5px] font-bold text-ink"><Ic name={ch === "WhatsApp" ? "whatsapp" : ch === "Email" ? "mail" : "phone"} size={14} className="text-mute" /> {ch}</span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-faint">{vis} · per-listing overrides available</span>
              <Toggle checked={Boolean(on)} onChange={() => toast("ok", `${ch} visibility saved`)} label={`${ch} visible to guests`} />
            </span>
          </label>
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-[13.5px] font-bold text-ink">Deposits & payment schedule</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deposit at checkout"><Select defaultValue="30%"><option>20%</option><option>30%</option><option>50%</option><option>Fixed amount</option></Select></Field>
          <Field label="Balance due"><Select defaultValue="14 days before arrival"><option>At booking</option><option>14 days before arrival</option><option>7 days before arrival</option><option>At check-in</option></Select></Field>
        </div>
        <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">Overridable per listing and per service — direct bookings only. OTAs run their own payment flows.</p>
        <h4 className="mt-2 font-display text-[12.5px] font-bold text-ink">Cancellation policies (library)</h4>
        {policies.map((pol) => (
          <p key={pol.id} className="mb-1 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12px] font-semibold">
            <span className="min-w-0 flex-1 truncate">{pol.text}</span> {pol.isDefault && <Badge tone="ok">default</Badge>}
            <Btn size="xs" variant="ghost" onClick={() => { setEditingPolicy(pol); setPolicyDraft(pol.text); }}>Edit</Btn>
          </p>
        ))}
        <h4 className="mt-2 font-display text-[12.5px] font-bold text-ink">Shared fees & taxes library</h4>
        <p className="text-[11px] text-mute">Defined once, applied to any property: cleaning Rp 400k · service 5% · VAT 11% · tourism levy pass-through.</p>
      </div>

      <Modal open={!!editingPolicy} onClose={() => setEditingPolicy(null)} title="Edit cancellation policy" w={440}
        footer={<><Btn variant="ghost" onClick={() => setEditingPolicy(null)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => {
          if (!editingPolicy) return;
          setPolicies((arr) => arr.map((x) => (x.id === editingPolicy.id ? { ...x, text: policyDraft.trim() || x.text } : x)));
          toast("ok", "Policy saved", "Applied to new direct bookings; existing reservations keep their snapshot.");
          setEditingPolicy(null);
        }}>Save policy</Btn></>}>
        <div className="space-y-3">
          <Field label="Policy terms (rendered verbatim on quotes & PDFs)">
            <Textarea value={policyDraft} onChange={(e) => setPolicyDraft(e.target.value)} className="!min-h-[110px]" />
          </Field>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-line px-3 py-2.5">
            <Toggle checked={editingPolicy?.isDefault ?? false} onChange={(v) => setPolicies((arr) => arr.map((x) => ({ ...x, isDefault: editingPolicy ? x.id === editingPolicy.id ? v : false : x.isDefault })))} label="Default policy" />
            <span className="text-[12px] font-bold text-ink">Make this the default policy</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}

function Reminders() {
  const { toast } = useApp();
  const [state, setState] = useState<Record<string, boolean>>({ d1b: true, h1b: true, h1a: true, h4a: false, d1a: true });
  const items: [string, string][] = [
    ["d1b", "1 day before due"], ["h1b", "1 hour before due"], ["h1a", "1 hour overdue"], ["h4a", "4 hours overdue"], ["d1a", "1 day overdue"],
  ];
  return (
    <div className="max-w-[560px] rounded-xl border border-line bg-card p-4">
      <h3 className="font-display text-[13.5px] font-bold text-ink">WhatsApp reminders to assigned staff</h3>
      <p className="mb-3 text-[11px] text-mute">Each independently toggleable · sent in the staff member's language · quiet hours respected (21:00–06:00 property-local).</p>
      {items.map(([key, label]) => (
        <label key={key} className="mb-2 flex items-center justify-between rounded-lg border border-line px-3 py-2.5">
          <span className="flex items-center gap-2 text-[12.5px] font-bold text-ink"><Ic name="whatsapp" size={14} className="text-brand" /> {label}</span>
          <Toggle checked={state[key]} onChange={(v) => { setState({ ...state, [key]: v }); toast("ok", `Reminder ${v ? "enabled" : "disabled"}`, label); }} label={`Reminder ${label}`} />
        </label>
      ))}
    </div>
  );
}

function ReportingCurrencyControl() {
  const { displayCurrency, setWorkspaceCurrency, refreshRates, fxTick, toast } = useApp();
  void fxTick;
  const [busy, setBusy] = useState(false);
  const fx = fxInfo();
  return (
    <div className="flex items-center gap-2">
      <Select value={displayCurrency} onChange={(e) => { setWorkspaceCurrency(e.target.value as never); toast("ok", `Reporting currency → ${e.target.value}`, "Every report, dashboard and statement re-renders at the stored FX rate."); }} aria-label="Reporting currency">
        <option value="IDR">IDR — Indonesian Rupiah</option>
        <option value="USD">USD — US Dollar</option>
        <option value="EUR">EUR — Euro</option>
      </Select>
      <button
        onClick={async () => { setBusy(true); const ok = await refreshRates(); setBusy(false); toast(ok ? "ok" : "warn", ok ? "Live rates loaded" : "Snapshot in use", ok ? `1 USD = ${fxInfo().rate.IDR.toLocaleString()} IDR` : "open.er-api.com unreachable — dated snapshot applies."); }}
        className="flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-2 font-mono text-[10.5px] font-bold text-mute transition-colors hover:border-brand hover:text-brand-deep"
      >
        <span className={cx(busy && "anim-spin")}><Ic name="refresh" size={12} /></span>
        {busy ? "fetching…" : "refresh rates"}
      </button>
      <span className={cx("rounded-full px-2 py-1 font-mono text-[9.5px] font-bold", fx.source === "live" ? "bg-brand-soft text-brand-deep" : "bg-paper text-faint")}>
        {fx.source === "live" ? "live" : "snapshot"} · {fx.asOf}
      </span>
    </div>
  );
}

function Notifications() {
  const [matrix, setMatrix] = useState<Record<string, boolean>>({ "0-0": true, "0-1": true, "1-0": true, "1-1": true, "2-1": true });
  const [dailyWA, setDailyWA] = useState(true);
  return (
    <div className="space-y-4">
      {NOTIF_EVENTS.map((group, r) => {
        return (
          <div key={group.group} className="rounded-xl border border-line bg-card">
            <header className="border-b border-line px-4 py-2.5"><h3 className="font-display text-[13px] font-bold text-ink">{group.group}</h3></header>
            <table className="w-full text-left">
              <thead><tr className="border-b border-line text-[9.5px] font-bold uppercase tracking-wider text-mute"><th className="px-4 py-2">Event</th>{NOTIF_CHANNELS.map((c) => <th key={c} className="px-2 py-2 text-center">{c}</th>)}</tr></thead>
              <tbody>
                {group.events.map((ev, ci) => (
                  <tr key={ev} className="border-b border-line/50">
                    <td className="px-4 py-1.5 text-[12px] font-semibold">{ev}</td>
                    {NOTIF_CHANNELS.map((c, k) => {
                      const key = `${r}-${ci}-${k}`;
                      const on = matrix[key] ?? k <= 1;
                      return (
                        <td key={c} className="px-2 py-1.5 text-center">
                          <Toggle checked={on} onChange={(v) => setMatrix({ ...matrix, [key]: v })} label={`${ev} via ${c}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <div className="flex max-w-[560px] items-center justify-between rounded-xl border border-line bg-card px-4 py-3">
        <div>
          <p className="text-[13px] font-bold text-ink">WhatsApp daily booking summary</p>
          <p className="text-[11px] text-mute">08:00 property-local · arrivals, departures, revenue yesterday.</p>
        </div>
        <Toggle checked={dailyWA} onChange={setDailyWA} label="WhatsApp daily summary" />
      </div>
    </div>
  );
}
