import { useEffect, useRef, useState } from "react";
import FlagSegments from "./FlagSegments";
import { Button } from "../ui/Button";
import { SearchInput } from "../ui/SearchInput";
import { StatusBadge } from "../ui/StatusBadge";
import { SkeletonRows } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { VirtualList } from "../ui/VirtualList";
import { useToast } from "../ui/Toast";

interface Rule { field: string; op: string; value: string; }
interface FeatureFlag {
  id: number; name: string; description?: string; rollout: number; version?: number; rules: Rule[];
}

const API = "http://localhost:8000";
const PAGE = 100;
const ROW_H = 52;

function statusFor(rollout: number): { tone: "on" | "off" | "partial"; label: string } {
  const pct = Math.round(rollout * 100);
  if (pct <= 0) return { tone: "off", label: "Off" };
  if (pct >= 100) return { tone: "on", label: "On · 100%" };
  return { tone: "partial", label: `${pct}%` };
}

export default function ListFlags() {
  const toast = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searching, setSearching] = useState(false);
  const [offset, setOffset] = useState(0);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [killTarget, setKillTarget] = useState<FeatureFlag | null>(null);
  const [killing, setKilling] = useState(false);
  const firstLoad = useRef(true);

  // debounce the search box
  useEffect(() => {
    setSearching(true);
    const t = setTimeout(() => { setDebounced(search.trim()); setOffset(0); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  async function fetchFlags(q: string, off: number) {
    if (firstLoad.current) setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(PAGE), offset: String(off) });
      if (q) qs.set("search", q);
      const res = await fetch(`${API}/flags?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFlags(await res.json());
      setError("");
    } catch {
      setError("Couldn't load feature flags. Is the API running at " + API + "? Retry in a moment.");
    } finally {
      setLoading(false);
      setSearching(false);
      firstLoad.current = false;
    }
  }

  useEffect(() => { fetchFlags(debounced, offset); /* eslint-disable-next-line */ }, [debounced, offset]);

  async function confirmKill() {
    if (!killTarget) return;
    setKilling(true);
    try {
      const res = await fetch(`${API}/flags/${encodeURIComponent(killTarget.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: killTarget.name,
          description: killTarget.description,
          rollout: 0,
          rules: killTarget.rules,
          expected_version: killTarget.version,
        }),
      });
      if (res.status === 409) {
        toast.push("error", `"${killTarget.name}" changed elsewhere — refreshing. Try again.`);
      } else if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.push("error", d.detail || "Kill failed.");
      } else {
        toast.push("success", `Killed "${killTarget.name}" — rollout set to 0%.`);
      }
      setKillTarget(null);
      await fetchFlags(debounced, offset);
    } finally {
      setKilling(false);
    }
  }

  // ---- edit view (kept from the existing flow) --------------------------------
  if (editingFlag) return <EditFlag flag={editingFlag} onClose={() => setEditingFlag(null)} onSaved={() => { setEditingFlag(null); fetchFlags(debounced, offset); }} />;

  const showingFrom = flags.length ? offset + 1 : 0;
  const showingTo = offset + flags.length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-lg border border-default bg-surface shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-content">Feature Flags</h2>
            <p className="text-xs text-content-muted">Search, review status, and kill a flag during an incident.</p>
          </div>
          <div className="w-full sm:w-80">
            <SearchInput value={search} onChange={setSearch} busy={searching} placeholder="Search flags by name…" aria-label="Search flags" />
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center gap-4 border-b border-default bg-surface-2 px-4 py-2 text-xs font-medium uppercase tracking-wide text-content-subtle">
          <span className="flex-1">Flag</span>
          <span className="w-24 text-center">Status</span>
          <span className="hidden w-40 sm:block">Rollout</span>
          <span className="hidden w-14 text-center md:block">Rules</span>
          <span className="w-[150px] text-right">Actions</span>
        </div>

        {/* Body */}
        {loading ? (
          <SkeletonRows rows={8} rowHeight={ROW_H} />
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <div className="mt-3"><Button onClick={() => fetchFlags(debounced, offset)}>Retry</Button></div>
          </div>
        ) : flags.length === 0 ? (
          debounced ? (
            <EmptyState icon="🔍" title={`No flags match “${debounced}”`} hint="Try a different name, or clear the search." action={<Button onClick={() => setSearch("")}>Clear search</Button>} />
          ) : (
            <EmptyState icon="🚩" title="No feature flags yet" hint="Create your first flag with the form above to start controlling rollouts." />
          )
        ) : (
          <VirtualList
            items={flags}
            rowHeight={ROW_H}
            height={Math.min(flags.length, 10) * ROW_H + 8}
            renderRow={(flag) => {
              const st = statusFor(flag.rollout);
              const pct = Math.round(flag.rollout * 100);
              return (
                <div className="flex h-full items-center gap-4 border-b border-default px-4 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-content" title={flag.name}>{flag.name}</div>
                    {flag.description && <div className="truncate text-xs text-content-subtle" title={flag.description}>{flag.description}</div>}
                  </div>
                  <div className="w-24 text-center"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></div>
                  <div className="hidden w-40 items-center gap-2 sm:flex">
                    <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs tabular-nums text-content-muted">{pct}%</span>
                  </div>
                  <div className="hidden w-14 text-center text-xs text-content-muted md:block">{flag.rules.length || "—"}</div>
                  <div className="flex w-[150px] items-center justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingFlag({ ...flag })}>Edit</Button>
                    <Button size="sm" variant="danger" disabled={pct === 0} onClick={() => setKillTarget(flag)} title={pct === 0 ? "Already off" : "Kill — set rollout to 0%"}>Kill</Button>
                  </div>
                </div>
              );
            }}
          />
        )}

        {/* Pagination */}
        {!loading && !error && (flags.length > 0 || offset > 0) && (
          <div className="flex items-center justify-between border-t border-default px-4 py-2.5 text-xs text-content-muted">
            <span>{flags.length ? `Showing ${showingFrom}–${showingTo}` : "No results on this page"}{debounced ? ` for “${debounced}”` : ""}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>← Prev</Button>
              <Button size="sm" variant="secondary" disabled={flags.length < PAGE} onClick={() => setOffset(offset + PAGE)}>Next →</Button>
            </div>
          </div>
        )}
      </div>

      {/* Kill confirmation with impact preview */}
      <ConfirmDialog
        open={!!killTarget}
        danger
        busy={killing}
        title={killTarget ? `Kill “${killTarget.name}”?` : ""}
        confirmLabel="Kill flag"
        onConfirm={confirmKill}
        onCancel={() => setKillTarget(null)}
      >
        {killTarget && (
          <div className="space-y-2">
            <p>This sets the rollout from <strong className="text-content">{Math.round(killTarget.rollout * 100)}%</strong> to <strong className="text-content">0%</strong> — the feature turns <strong className="text-content">off</strong> for all users matched by rollout.</p>
            {killTarget.rules.length > 0 && (
              <p className="rounded-md bg-warning-soft px-3 py-2 text-warning">Heads up: this flag has {killTarget.rules.length} targeting rule{killTarget.rules.length !== 1 ? "s" : ""}. Users matched by a segment override may still be affected — review targeting if this must be fully off.</p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Edit panel — preserves the existing edit capability (rollout, description,
   segments, legacy rules), restyled onto the design-system Button.
--------------------------------------------------------------------------- */
function EditFlag({ flag, onClose, onSaved }: { flag: FeatureFlag; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [editingFlag, setEditingFlag] = useState<FeatureFlag>({ ...flag, rules: [...flag.rules] });
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: any) => setEditingFlag({ ...editingFlag, [field]: value });
  const addRule = () => setEditingFlag({ ...editingFlag, rules: [...editingFlag.rules, { field: "", op: "eq", value: "" }] });
  const removeRule = (i: number) => setEditingFlag({ ...editingFlag, rules: editingFlag.rules.filter((_, idx) => idx !== i) });
  const updateRule = (i: number, k: keyof Rule, v: string) => {
    const rules = [...editingFlag.rules]; rules[i][k] = v; setEditingFlag({ ...editingFlag, rules });
  };

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/flags/${encodeURIComponent(editingFlag.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingFlag.name, description: editingFlag.description, rollout: editingFlag.rollout, rules: editingFlag.rules, expected_version: editingFlag.version }),
      });
      if (res.status === 409) { toast.push("error", "This flag changed elsewhere. Reopen and retry."); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.push("error", d.detail || "Update failed."); return; }
      toast.push("success", `Updated “${editingFlag.name}”.`);
      onSaved();
    } finally { setSaving(false); }
  }

  const pct = Math.round(editingFlag.rollout * 100);
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-default bg-surface p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-content">Edit “{editingFlag.name}”</h2>
        <button onClick={onClose} aria-label="Close" className="rounded p-1 text-content-subtle hover:bg-surface-2 hover:text-content">✕</button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-content">Rollout</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} value={pct} onChange={(e) => update("rollout", parseInt(e.target.value) / 100)} className="flex-1" aria-label="Rollout percentage" />
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={100} value={pct} onChange={(e) => update("rollout", parseInt(e.target.value || "0") / 100)} className="w-16 rounded-md border border-strong px-2 py-1 text-sm" />
              <span className="text-sm text-content-muted">%</span>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-content">Description</label>
          <textarea rows={3} value={editingFlag.description || ""} onChange={(e) => update("description", e.target.value)} className="w-full rounded-md border border-strong px-3 py-2 text-sm" />
        </div>

        <FlagSegments flagId={editingFlag.id} flagName={editingFlag.name} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-content">Legacy targeting rules</label>
            <Button size="sm" onClick={addRule}>+ Add rule</Button>
          </div>
          <p className="mb-3 text-xs text-content-subtle">Used only when no segment matches.</p>
          <div className="space-y-2">
            {editingFlag.rules.map((rule, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 rounded-md border border-default bg-surface-2 p-2">
                <input placeholder="field" value={rule.field} onChange={(e) => updateRule(i, "field", e.target.value)} className="rounded-md border border-strong px-2 py-1.5 text-sm" />
                <select value={rule.op} onChange={(e) => updateRule(i, "op", e.target.value)} className="rounded-md border border-strong px-2 py-1.5 text-sm">
                  <option value="eq">equals</option><option value="ne">not equals</option><option value="gt">greater than</option><option value="lt">less than</option>
                </select>
                <input placeholder="value" value={rule.value} onChange={(e) => updateRule(i, "value", e.target.value)} className="rounded-md border border-strong px-2 py-1.5 text-sm" />
                <button onClick={() => removeRule(i)} className="px-2 text-sm text-danger hover:text-danger-hover" aria-label={`Remove rule ${i + 1}`}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-t border-default pt-5">
        <Button variant="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
