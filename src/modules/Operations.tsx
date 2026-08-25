import { useMemo, useState } from "react";
import { cx, money, timeAgo, fmtDate, fmtDateTime, download, toCSV, uid, relDay } from "../lib/format";
import { Ic, type IconName } from "../components/icons";
import { Avatar, Badge, Btn, Dot, Empty, Field, Input, Modal, PriorityChip, SearchBox, Select, Tabs, Textarea, Toggle } from "../components/ui";
import { useApp } from "../store";
import { AUTOMATIONS, EXPENSE_CATEGORIES, PROVIDERS, RECIPES, TASK_TEMPLATES, WORKSPACE, memberById, propertyById } from "../lib/data";
import type { Priority, Task, TaskType } from "../lib/types";

export default function Operations() {
  const { route } = useApp();
  const [tab, setTab] = useState(route.query.get("tab") ?? "board");
  const tasks = useApp((s) => s.tasks);
  const open = tasks.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const overdue = tasks.filter((t) => (t.status === "open" || t.status === "in_progress") && t.due < Date.now()).length;
  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "board", label: "Command Center", count: open },
          { id: "templates", label: "Task templates" },
          { id: "providers", label: "Providers" },
          { id: "automations", label: "Automations" },
          { id: "issues", label: "Issue reports", count: useApp((s) => s.issues.filter((i) => i.state === "pending").length) },
          { id: "expenses", label: "Expenses" },
        ]}
        active={tab} onChange={setTab}
      />
      {tab === "board" && <Board overdue={overdue} />}
      {tab === "templates" && <Templates />}
      {tab === "providers" && <Providers />}
      {tab === "automations" && <Automations />}
      {tab === "issues" && <Issues />}
      {tab === "expenses" && <Expenses />}
    </div>
  );
}

// ── Command Center ─────────────────────────────────────────────────────────
function Board({ overdue }: { overdue: number }) {
  const { navigate, myTasks, setMyTasks, addTask, toggleCheckItem, flagCheckItem, completeTask, toast } = useApp();
  const tasks = useApp((s) => s.tasks);
  const [view, setView] = useState<"list" | "map">("list");
  const [state, setState] = useState<"active" | "expired" | "completed">("active");
  const [assignee, setAssignee] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(useApp.getState().route.query.get("task"));
  const [quickOpen, setQuickOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [qt, setQt] = useState({ title: "", property: "p-anggrek", priority: "medium" as Priority, assignee: "m-wayan" });
  const [flagFor, setFlagFor] = useState<{ taskId: string; itemId: string; label: string } | null>(null);
  const [flagNote, setFlagNote] = useState("");

  const list = useMemo(() => {
    let out = tasks.filter((t) =>
      state === "active" ? (t.status === "open" || t.status === "in_progress") && t.due >= Date.now() - 12 * 3_600_000
        : state === "expired" ? ((t.status === "expired") || ((t.status === "open" || t.status === "in_progress") && t.due < Date.now()))
        : t.status === "done",
    );
    if (assignee !== "all") out = out.filter((t) => t.assigneeId === assignee);
    if (myTasks) out = out.filter((t) => t.assigneeId === "m-you");
    return out.sort((a, b) => a.due - b.due);
  }, [tasks, state, assignee, myTasks]);

  const detail = tasks.find((t) => t.id === detailId) ?? null;

  const createQuick = () => {
    addTask({
      id: uid("t"), title: qt.title || "Untitled task", type: "custom", propertyId: qt.property, assigneeId: qt.assignee,
      due: Date.now() + 86_400_000, priority: qt.priority, status: "open",
      checklist: [{ id: uid("ci"), label: "Complete", done: false, requiresPhoto: false }], createdAt: Date.now(),
    });
    setQuickOpen(false); setQt({ ...qt, title: "" });
    toast("ok", "Task created", "Assignee notified via WhatsApp + email (their preference).");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-line bg-card p-0.5">
          {([["list", "list", "List"], ["map", "map", "Map"]] as const).map(([id, icon, label]) => (
            <button key={id} onClick={() => setView(id)} aria-pressed={view === id} className={cx("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-bold", view === id ? "bg-pine-900 text-white" : "text-mute hover:text-ink")}>
              <Ic name={icon} size={13} /> {label}
            </button>
          ))}
        </div>
        <Tabs tabs={[{ id: "active", label: "Active" }, { id: "expired", label: "Expired", count: overdue }, { id: "completed", label: "Completed" }]} active={state} onChange={(s) => setState(s as never)} />
        <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="!w-[150px]" aria-label="Assignee filter">
          <option value="all">All assignees</option>
          {["m-you", "m-marco", "m-wayan", "m-kadek", "m-ari", "m-komang", "m-jana"].map((m) => <option key={m} value={m}>{memberById(m)?.name}</option>)}
        </Select>
        <label className="flex items-center gap-1.5 text-[11.5px] font-bold text-mute"><Toggle checked={myTasks} onChange={setMyTasks} label="My tasks only" /> mine</label>
        <div className="ml-auto flex gap-2">
          <Btn icon="phone" onClick={() => setMobileOpen(true)}>Staff mobile view</Btn>
          <Btn variant="solid" icon="plus" onClick={() => setQuickOpen(true)}>Quick task</Btn>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
                <th className="px-4 py-2.5">Task</th><th className="px-3 py-2.5">Property</th><th className="px-3 py-2.5">Assignee</th>
                <th className="px-3 py-2.5">Priority</th><th className="px-3 py-2.5">Progress</th><th className="px-3 py-2.5">Due</th><th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7}><Empty icon="check" title="Nothing here" body={state === "expired" ? "No expired tasks — the reference product had 14 unresolved SOP mismatches; you have none." : "All clear."} /></td></tr>}
              {list.map((t) => {
                const p = propertyById(t.propertyId);
                const m = memberById(t.assigneeId);
                const done = t.checklist.filter((c) => c.done).length;
                const overdueT = (t.status === "open" || t.status === "in_progress") && t.due < Date.now();
                const mismatch = t.templateId && t.templateVersion !== undefined && TASK_TEMPLATES.find((x) => x.id === t.templateId)?.version !== t.templateVersion;
                return (
                  <tr key={t.id} className="cursor-pointer border-b border-line/60 transition-colors hover:bg-paper/70" onClick={() => setDetailId(t.id)}>
                    <td className="px-4 py-2.5">
                      <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                        <Ic name={t.type === "cleaning" ? "sparkle" : t.type === "maintenance" ? "wrench" : t.type === "inspection" ? "target" : "doc"} size={13} className="text-mute" />
                        {t.title}
                        {mismatch && <Badge tone="warn">template v{t.templateVersion} → v{TASK_TEMPLATES.find((x) => x.id === t.templateId)?.version} · review & re-apply</Badge>}
                        {t.offlineQueued ? <Badge tone="info"><Ic name="upload" size={9} /> {t.offlineQueued} waiting to upload</Badge> : null}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold">{p.name}</td>
                    <td className="px-3 py-2.5">{m ? <span className="flex items-center gap-1.5 text-[12px] font-semibold"><Avatar name={m.name} color={m.color} size={22} />{m.name.split(" ")[0]}</span> : <Badge tone="warn">unassigned</Badge>}</td>
                    <td className="px-3 py-2.5"><PriorityChip p={t.priority} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${(done / Math.max(1, t.checklist.length)) * 100}%` }} /></div>
                        <span className="font-mono text-[10px] font-bold text-mute">{done}/{t.checklist.length}</span>
                      </div>
                    </td>
                    <td className={cx("px-3 py-2.5 font-mono text-[11px] font-bold", overdueT ? "text-danger" : t.due - Date.now() < 6 * 3_600_000 ? "text-[#8a5c07]" : "text-mute")}>
                      {t.status === "done" ? `done ${t.completedAt ? timeAgo(t.completedAt) : ""}` : overdueT ? `overdue ${timeAgo(t.due)}` : relDay(new Date(t.due)) === "today" ? `today ${fmtDateTime(t.due).split(", ")[1]}` : relDay(new Date(t.due))}
                    </td>
                    <td className="px-3 py-2.5"><Ic name="chevR" size={14} className="text-faint" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="mb-3 text-[11.5px] font-semibold text-mute">Schematic map of Bali — pin size = open tasks, colour = worst priority on site.</p>
          <div className="relative mx-auto h-[380px] max-w-[760px] overflow-hidden rounded-xl border border-line bg-[#E4EDE6]">
            <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path d="M6 40 C10 22 26 10 44 9 C60 8 74 12 86 20 C95 26 96 38 90 46 C82 57 64 63 46 62 C28 61 12 55 6 40 Z" fill="#CFE0CE" stroke="#9DB89F" strokeWidth="0.5" />
              <path d="M80 60 q4 -2 7 1 q-2 4 -7 2 z" fill="#CFE0CE" stroke="#9DB89F" strokeWidth="0.4" />
              <text x="30" y="30" fontSize="3" fill="#61705F" fontWeight="bold">Canggu</text>
              <text x="48" y="26" fontSize="3" fill="#61705F" fontWeight="bold">Ubud</text>
              <text x="14" y="56" fontSize="3" fill="#61705F" fontWeight="bold">Uluwatu</text>
              <text x="36" y="40" fontSize="3" fill="#61705F" fontWeight="bold">Seminyak</text>
              <text x="80" y="52" fontSize="3" fill="#61705F" fontWeight="bold">Lembongan</text>
            </svg>
            {useApp.getState().properties.filter((p) => !p.archived).map((p) => {
              const open = tasks.filter((t) => t.propertyId === p.id && (t.status === "open" || t.status === "in_progress"));
              const worst = open.some((t) => t.priority === "urgent" || t.priority === "emergency") ? "#B42318" : open.some((t) => t.due < Date.now()) ? "#9A6A0B" : "#0E6B4E";
              return (
                <button key={p.id} onClick={() => { setAssignee("all"); setState("active"); }} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.map.x}%`, top: `${p.map.y}%` }} aria-label={`${p.name}: ${open.length} open tasks`}>
                  <span className="flex items-center justify-center rounded-full border-2 border-white font-mono text-[10px] font-bold text-white shadow-md transition-transform group-hover:scale-110" style={{ width: 22 + open.length * 5, height: 22 + open.length * 5, background: worst }}>
                    {open.length}
                  </span>
                  <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-pine-900 px-1.5 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Task detail drawer */}
      <Modal open={!!detail} onClose={() => setDetailId(null)} title={detail?.title ?? ""} w={560}
        footer={detail && <>
          {detail.status !== "done" && <Btn variant="solid" icon="check" onClick={() => { completeTask(detail.id); setDetailId(null); toast("ok", "Task completed", "Timestamp + checklist state synced (offline queue empty)."); }}>Mark complete</Btn>}
          <Btn variant="ghost" onClick={() => setDetailId(null)}>Close</Btn>
        </>}>
        {detail && (() => {
          const p = propertyById(detail.propertyId);
          const m = memberById(detail.assigneeId);
          return (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <PriorityChip p={detail.priority} />
                <Badge tone="mute">{detail.type}</Badge>
                <span className="font-semibold text-mute">{p.name} · {m ? m.name : "unassigned"} · due {fmtDateTime(detail.due)}</span>
                {detail.linkedReservationId && <button className="font-bold text-brand-deep hover:underline" onClick={() => navigate(`/reservations/${detail.linkedReservationId}`)}>linked: {detail.linkedReservationId.toUpperCase()}</button>}
              </div>
              <ul className="space-y-1.5">
                {detail.checklist.map((c) => (
                  <li key={c.id} className={cx("flex items-center gap-2.5 rounded-lg border px-3 py-2", c.done ? "border-brand/30 bg-brand-soft/50" : c.flagged ? "border-danger/40 bg-danger-soft/50" : "border-line bg-card")}>
                    <button aria-label={`Toggle ${c.label}`} onClick={() => toggleCheckItem(detail.id, c.id)} className={cx("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all", c.done ? "border-brand bg-brand text-white" : "border-line2 hover:border-brand")}>
                      {c.done && <Ic name="check" size={11} sw={3} />}
                    </button>
                    <span className={cx("flex-1 text-[12.5px] font-semibold", c.done ? "text-mute line-through" : c.flagged ? "text-danger" : "text-ink")}>{c.label}</span>
                    {c.requiresPhoto && <Ic name="camera" size={13} className="text-faint" aria-label="Requires photo" />}
                    {c.flagged && <Badge tone="danger">flagged</Badge>}
                    {!c.done && !c.flagged && <Btn size="xs" variant="ghost" icon="flag" onClick={() => { setFlagFor({ taskId: detail.id, itemId: c.id, label: c.label }); setFlagNote(""); }}>Flag issue</Btn>}
                  </li>
                ))}
              </ul>
              <p className="text-[10.5px] text-faint">Staff complete this checklist offline in the PWA — photos are compressed client-side and never dropped; sync is last-writer-wins on state only.</p>
            </div>
          );
        })()}
      </Modal>

      {/* Quick create */}
      <Modal open={quickOpen} onClose={() => setQuickOpen(false)} title="Quick task" w={440}
        footer={<><Btn variant="ghost" onClick={() => setQuickOpen(false)}>Cancel</Btn><Btn variant="solid" icon="plus" onClick={createQuick}>Create task</Btn></>}>
        <div className="space-y-3">
          <Field label="Title"><Input value={qt.title} onChange={(e) => setQt({ ...qt, title: e.target.value })} placeholder="Restock fire extinguishers" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Property">
              <Select value={qt.property} onChange={(e) => setQt({ ...qt, property: e.target.value })}>
                {useApp.getState().properties.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={qt.priority} onChange={(e) => setQt({ ...qt, priority: e.target.value as Priority })}>
                {(["low", "medium", "high", "urgent", "emergency"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Assignee">
            <Select value={qt.assignee} onChange={(e) => setQt({ ...qt, assignee: e.target.value })}>
              <option value="">Anyone available (round-robin by workload)</option>
              {["m-wayan", "m-kadek", "m-ari", "m-komang", "m-jana"].map((m) => <option key={m} value={m}>{memberById(m)?.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Flag issue */}
      <Modal open={!!flagFor} onClose={() => setFlagFor(null)} title="Flag an issue" w={440}
        footer={<><Btn variant="ghost" onClick={() => setFlagFor(null)}>Cancel</Btn><Btn variant="danger" icon="flag" onClick={() => { if (flagFor) { flagCheckItem(flagFor.taskId, flagFor.itemId, flagNote || "Flagged from checklist"); setFlagFor(null); } }}>Report issue</Btn></>}>
        <p className="mb-2 text-[12.5px] font-semibold text-ink">{flagFor?.label}</p>
        <Field label="What's wrong?"><Textarea value={flagNote} onChange={(e) => setFlagNote(e.target.value)} placeholder="Describe the issue — a photo from the device is attached automatically." /></Field>
      </Modal>

      {/* Staff mobile preview */}
      <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} title="Staff view · Komang Devi (PWA, offline-ready)" w={400}>
        <div className="mx-auto w-[300px] rounded-[28px] border-[6px] border-pine-900 bg-paper shadow-2xl">
          <div className="rounded-t-[22px] bg-pine-900 px-4 pb-3 pt-4 text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5BCBA9]">Today · {fmtDate(new Date())}</p>
            <p className="font-display text-[15px] font-bold">3 jobs · 1 offline item pending</p>
            <p className="mt-1 flex items-center gap-1.5 rounded-md bg-gold/20 px-2 py-1 text-[10px] font-bold text-gold-soft"><Ic name="upload" size={11} /> 3 items waiting to upload — will sync when back online</p>
          </div>
          <div className="space-y-2 p-3">
            {tasks.filter((t) => t.assigneeId === "m-komang" && (t.status === "open" || t.status === "in_progress")).slice(0, 2).map((t) => (
              <div key={t.id} className="rounded-xl border border-line bg-card p-3">
                <p className="text-[12px] font-bold text-ink">{t.title}</p>
                <p className="text-[10px] text-mute">{propertyById(t.propertyId).name} · due {fmtDateTime(t.due).split(", ")[1]}</p>
                <div className="mt-2 space-y-1">
                  {t.checklist.slice(0, 3).map((c) => (
                    <p key={c.id} className={cx("flex items-center gap-1.5 text-[10.5px] font-semibold", c.done ? "text-brand-deep" : "text-mute")}>
                      <Ic name={c.done ? "checkCircle" : "clock"} size={11} /> {c.label} {c.requiresPhoto && <Ic name="camera" size={10} />}
                    </p>
                  ))}
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Btn size="xs" variant="solid" icon="camera">Photo</Btn>
                  <Btn size="xs" icon="flag" variant="ghost">Flag</Btn>
                  <Btn size="xs" icon="check" className="ml-auto">Done</Btn>
                </div>
              </div>
            ))}
            <p className="text-center text-[9.5px] text-faint">Today's + tomorrow's assignments are cached · checklist state, photos and time entries queue durably offline.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────
function Templates() {
  const icons: Record<TaskType, IconName> = { cleaning: "sparkle", maintenance: "wrench", inspection: "target", custom: "doc" };
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {TASK_TEMPLATES.map((t) => (
        <div key={t.id} className="rounded-xl border border-line bg-card p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-deep"><Ic name={icons[t.type]} size={16} /></span>
            <div className="flex-1">
              <p className="text-[13.5px] font-bold text-ink">{t.name}</p>
              <p className="text-[10.5px] font-semibold text-mute">{t.type} · ~{t.estMinutes} min · default: {t.defaultRole}</p>
            </div>
            <Badge tone="info">v{t.version}</Badge>
          </div>
          <ol className="mt-3 space-y-1">
            {t.items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-mute">
                <span className="font-mono text-[10px] font-bold text-faint">{i + 1}</span> {it.label}
                {it.requiresPhoto && <span className="flex items-center gap-0.5 rounded bg-sea-soft px-1 text-[9px] font-bold text-sea"><Ic name="camera" size={9} /> photo</span>}
              </li>
            ))}
          </ol>
          <p className="mt-2.5 rounded-md bg-paper px-2.5 py-1.5 text-[10.5px] text-mute">Tasks created from v{t.version - 1} surface as mismatches with a one-click “review & re-apply” — never a permanent badge.</p>
        </div>
      ))}
    </div>
  );
}

// ── Providers ──────────────────────────────────────────────────────────────
function Providers() {
  const toast = useApp((s) => s.toast);
  const [status, setStatus] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sea/40 bg-sea-soft/60 px-4 py-3">
        <Ic name="mail" size={16} className="text-sea" />
        <div className="flex-1 text-[12px]">
          <p className="font-bold text-ink">Inbound provider-invoice email — unique to your workspace</p>
          <p className="font-mono text-[11.5px] text-sea">{WORKSPACE.inboundEmail}</p>
        </div>
        <p className="max-w-[320px] text-[10.5px] leading-snug text-mute">Forward provider invoices here — attachments parse into <b>draft expenses</b> awaiting approval.</p>
        <Btn size="xs" icon="copy" onClick={() => toast("ok", "Address copied", WORKSPACE.inboundEmail)}>Copy</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PROVIDERS.map((p) => {
          const st = status[p.id] ?? p.status;
          return (
            <div key={p.id} className="rounded-xl border border-line bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{p.name}</p>
                  <p className="text-[11px] text-mute">{p.contact} · {p.phone}</p>
                </div>
                <Dot tone={st === "active" ? "ok" : st === "inactive" ? "mute" : "danger"} label={st} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.specialties.map((s) => <Badge key={s} tone="mute">{s.replace("_", " ")}</Badge>)}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11.5px]">
                <span className="font-mono font-bold text-ink">{money(p.hourlyRate, p.currency)}/h</span>
                <span className="text-mute">{p.jobsDone} jobs · {p.hasAppAccess ? <Dot tone="ok" label="app access" /> : <Dot tone="warn" label="no app — notified via WhatsApp" />}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Btn size="xs" variant="solid" icon="wrench" onClick={() => { setStatus({ ...status, [p.id]: st }); toast("ok", "Maintenance task assigned", `${p.name} notified by ${p.hasAppAccess ? "app" : "WhatsApp + email"} with the work order.`); }}>Assign task</Btn>
                <Btn size="xs" variant="ghost" onClick={() => setStatus({ ...status, [p.id]: st === "active" ? "inactive" : "active"})}>{st === "active" ? "Deactivate" : "Activate"}</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Automations ────────────────────────────────────────────────────────────
function Automations() {
  const { toast } = useApp();
  const [builder, setBuilder] = useState(false);
  const [rows, setRows] = useState(AUTOMATIONS);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-mute">Event-based (booking created / cancelled / check-in / check-out) and recurring rules · offsets relative or at a fixed local time · DST-correct.</p>
        <Btn variant="solid" icon="plus" onClick={() => setBuilder(true)}>New automation</Btn>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {rows.map((a) => (
          <div key={a.id} className="rounded-xl border border-line bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-900 text-[#5BCBA9]"><Ic name={a.trigger === "recurring" ? "history" : "bolt"} size={16} /></span>
              <div className="flex-1">
                <p className="text-[13.5px] font-bold text-ink">{a.name}</p>
                <p className="text-[10.5px] font-semibold text-mute">{a.trigger.replace("_", " ")} · {a.scopeLabel} · {a.offsetLabel}</p>
              </div>
              <PriorityChip p={a.priority} />
              <Toggle checked={a.active} onChange={(v) => { setRows((r) => r.map((x) => (x.id === a.id ? { ...x, active: v } : x))); toast("info", `${a.name} ${v ? "activated" : "paused"}`); }} label={`Toggle ${a.name}`} />
            </div>
            <p className="mt-2.5 rounded-md bg-paper px-3 py-2 text-[11.5px] leading-relaxed text-mute"><b className="text-ink">Action:</b> {a.actionLabel} <span className="ml-1 font-mono text-[10px] text-faint">assign: {a.assignMode} · {a.runs} runs</span></p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-line bg-card p-4">
        <h3 className="mb-2 font-display text-[13.5px] font-bold text-ink">Quick-start recipes</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {RECIPES.map((r) => (
            <button key={r.name} onClick={() => toast("ok", "Recipe loaded into builder", r.name)} className="rounded-lg border border-dashed border-line2 px-3 py-2.5 text-left transition-all hover:border-brand hover:bg-brand-soft/40">
              <p className="text-[11.5px] font-bold text-ink">{r.name}</p>
              <p className="mt-0.5 text-[9.5px] font-semibold text-mute">{r.trigger} → {r.action}</p>
            </button>
          ))}
        </div>
      </div>

      <Modal open={builder} onClose={() => setBuilder(false)} title="Automation builder" w={560}
        footer={<><Btn variant="ghost" onClick={() => setBuilder(false)}>Cancel</Btn><Btn variant="solid" icon="check" onClick={() => { setBuilder(false); toast("ok", "Automation created", "Rule name auto-generated · first run scheduled"); }}>Create rule</Btn></>}>
        <div className="space-y-3">
          <Field label="Trigger family">
            <div className="grid grid-cols-2 gap-2">
              {["Event-based", "Recurring"].map((t, i) => (
                <button key={t} className={cx("rounded-lg border px-3 py-2 text-[12px] font-bold", i === 0 ? "border-brand bg-brand-soft text-brand-deep" : "border-line text-mute")}>{t}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Event"><Select defaultValue="check_out">{["Booking created", "Booking cancelled", "Booking checks in", "Booking checks out"].map((e) => <option key={e}>{e}</option>)}</Select></Field>
            <Field label="Scope"><Select defaultValue="All properties"><option>All properties</option><option>Samudra Estate group</option><option>Villa Purnama only</option></Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Offset"><Select defaultValue="At event time"><option>At event time</option><option>30 min before</option><option>1 day before</option><option>2 hours after</option></Select></Field>
            <Field label="Or fixed local time"><Input placeholder="09:00 (property tz)" /></Field>
          </div>
          <Field label="Action"><Select defaultValue="Create task from template"><option>Create / assign task from template</option><option>Notify a person or role</option><option>Send guest message</option></Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assign to"><Select defaultValue="Anyone available (round-robin)"><option>Anyone available (round-robin)</option><option>Made Ari</option><option>Komang Devi</option></Select></Field>
            <Field label="Priority"><Select defaultValue="High">{["Low", "Medium", "High", "Urgent", "Emergency"].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          </div>
          <p className="rounded-md bg-paper px-3 py-2 text-[11px] text-mute">Generated name: <b className="text-ink">“Checkout → turnover clean · all properties · at checkout time”</b> — editable, optional due date supported.</p>
        </div>
      </Modal>
    </div>
  );
}

// ── Issues ─────────────────────────────────────────────────────────────────
function Issues() {
  const { issues, setIssueState, escalateIssue } = useApp();
  return (
    <div className="space-y-2.5">
      {issues.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-4">
          <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", i.state === "pending" ? "bg-danger-soft text-danger" : i.state === "accepted" ? "bg-gold-soft text-[#8a5c07]" : "bg-brand-soft text-brand-deep")}>
            <Ic name={i.state === "resolved" ? "checkCircle" : "flag"} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">{i.item} <span className="font-semibold text-mute">· {propertyById(i.propertyId).name}</span></p>
            <p className="text-[11.5px] text-mute">{i.note}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[10px] font-semibold text-faint">
              {timeAgo(i.ts)} · from task {i.taskId.toUpperCase()} {i.photo && <span className="flex items-center gap-0.5"><Ic name="camera" size={10} /> photo attached</span>}
              {i.escalatedToTaskId && <Badge tone="info">escalated → {i.escalatedToTaskId.toUpperCase()}</Badge>}
            </p>
          </div>
          <Badge tone={i.state === "pending" ? "danger" : i.state === "accepted" ? "warn" : "ok"}>{i.state}</Badge>
          {i.state === "pending" && (
            <div className="flex gap-1.5">
              <Select className="!h-8 !w-[180px] !text-[11.5px]" defaultValue="" aria-label="Assign provider" onChange={(e) => e.target.value && setIssueState(i.id, "accepted", e.target.value)}>
                <option value="" disabled>Assign provider…</option>
                {PROVIDERS.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Btn size="sm" variant="solid" icon="wrench" onClick={() => escalateIssue(i.id)}>Escalate to maintenance task</Btn>
            </div>
          )}
          {i.state === "accepted" && <Btn size="sm" icon="check" onClick={() => setIssueState(i.id, "resolved")}>Mark resolved</Btn>}
        </div>
      ))}
    </div>
  );
}

// ── Expenses ───────────────────────────────────────────────────────────────
function Expenses() {
  const { expenses, setExpenseApproval, addExpense, toast } = useApp();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ note: "", vendor: "", amount: "", category: "maintenance", property: "p-anggrek", deductible: true, recurring: false });
  const list = expenses.filter((e) => !q || e.note.toLowerCase().includes(q.toLowerCase()) || e.vendor.toLowerCase().includes(q.toLowerCase()) || e.category.includes(q.toLowerCase()));
  const total = list.filter((e) => e.approval !== "rejected").reduce((s, e) => s + e.amount, 0);
  const deductible = list.filter((e) => e.taxDeductible && e.approval === "approved").reduce((s, e) => s + e.amount, 0);
  const recurring = list.filter((e) => e.recurring).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Period total</p><p className="mt-1 font-mono text-[19px] font-bold text-ink">{money(total, "IDR", { compact: true })}</p></div>
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Tax-deductible (approved)</p><p className="mt-1 font-mono text-[19px] font-bold text-brand-deep">{money(deductible, "IDR", { compact: true })}</p></div>
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Recurring / month</p><p className="mt-1 font-mono text-[19px] font-bold text-sea">{money(recurring, "IDR", { compact: true })}</p></div>
        <div className="rounded-xl border border-line bg-card p-3.5"><p className="text-[10px] font-bold uppercase tracking-wider text-mute">Pending approval</p><p className="mt-1 font-mono text-[19px] font-bold text-[#8a5c07]">{list.filter((e) => e.approval === "pending").length}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Search expenses" className="w-[220px]" />
        <Btn icon="upload" onClick={() => toast("ok", "CSV import started", "Dry-run first — per-row error report before commit.")}>Import CSV</Btn>
        <Btn icon="download" onClick={() => { download("trellis-expenses.csv", toCSV([["Date", "Category", "Note", "Vendor", "Amount", "Currency", "Approval"], ...list.map((e) => [e.date, e.category, e.note, e.vendor, e.amount, e.currency, e.approval])])); toast("ok", "Exported"); }}>Export</Btn>
        <Btn className="ml-auto" variant="solid" icon="plus" onClick={() => setAddOpen(true)}>Add expense</Btn>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="border-b border-line text-[10px] font-bold uppercase tracking-wider text-mute">
              <th className="px-4 py-2.5">Date</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Note</th><th className="px-3 py-2.5">Vendor</th>
              <th className="px-3 py-2.5 text-right">Amount</th><th className="px-3 py-2.5">Flags</th><th className="px-3 py-2.5">Approval</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-b border-line/60 transition-colors hover:bg-paper/70">
                <td className="px-4 py-2 font-mono text-[11px] text-mute">{e.date}</td>
                <td className="px-3 py-2"><Badge tone="mute">{e.category}</Badge></td>
                <td className="px-3 py-2">
                  <p className="text-[12px] font-semibold text-ink">{e.note}</p>
                  {e.taskId && <p className="text-[10px] font-bold text-sea">linked to {e.taskId.toUpperCase()}</p>}
                </td>
                <td className="px-3 py-2 text-[12px] text-mute">{e.vendor}</td>
                <td className="px-3 py-2 text-right font-mono text-[12px] font-bold text-ink">{money(e.amount, e.currency)}</td>
                <td className="px-3 py-2">
                  <span className="flex gap-1">
                    {e.taxDeductible && <Badge tone="ok">deductible</Badge>}
                    {e.recurring && <Badge tone="info">recurring</Badge>}
                    {e.receipt && <Badge tone="plum"><Ic name="clip" size={9} /> receipt</Badge>}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {e.approval === "pending" ? (
                    <span className="flex gap-1">
                      <Btn size="xs" variant="solid" icon="check" onClick={() => setExpenseApproval(e.id, "approved")}>Approve</Btn>
                      <Btn size="xs" variant="ghost" icon="x" onClick={() => setExpenseApproval(e.id, "rejected")}>Reject</Btn>
                    </span>
                  ) : (
                    <Dot tone={e.approval === "approved" ? "ok" : "danger"} label={e.approval} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add expense" w={460}
        footer={<><Btn variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Btn><Btn variant="solid" icon="plus" onClick={() => {
          addExpense({ id: uid("e"), date: new Date().toISOString().slice(0, 10), category: form.category as never, amount: Math.round(Number(form.amount) || 0), currency: "IDR", note: form.note, vendor: form.vendor, propertyId: form.property, taxDeductible: form.deductible, recurring: form.recurring, approval: "pending" });
          setAddOpen(false); toast("ok", "Expense submitted", "Awaiting approval.");
        }}>Submit for approval</Btn></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Note"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Pool chemicals" /></Field>
            <Field label="Vendor"><Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Sparkle Squad" /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Amount (IDR)"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="250000" /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </Field>
            <Field label="Property">
              <Select value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
                <option value="">Unlinked</option>
                {useApp.getState().properties.filter((p) => !p.archived).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-[12px] font-semibold"><Toggle checked={form.deductible} onChange={(v) => setForm({ ...form, deductible: v })} label="Tax deductible" /> Tax-deductible</label>
            <label className="flex items-center gap-2 text-[12px] font-semibold"><Toggle checked={form.recurring} onChange={(v) => setForm({ ...form, recurring: v })} label="Recurring" /> Recurring</label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
