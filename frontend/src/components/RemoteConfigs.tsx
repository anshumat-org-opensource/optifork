import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";

export interface RemoteConfig {
  id: number; key: string; description?: string;
  value_type: "string" | "number" | "boolean" | "json"; default_value: string;
  created_at: string; updated_at: string;
}
export interface ConfigSegment {
  id: number; config_id: number; segment_id: number; value: string; enabled: boolean; priority: number;
  segment: { id: number; name: string; description?: string; conditions: any[] };
}

const API = "http://localhost:8000";
const input = "w-full rounded-md border border-strong bg-surface px-3 py-2 text-sm text-content placeholder:text-content-subtle focus:border-primary focus:outline-none";
const TYPE_LABEL: Record<string, string> = { string: "Text", number: "Number", boolean: "Boolean", json: "JSON" };

function validate(value: string, t: string): boolean {
  if (!value) return false;
  if (t === "number") return !isNaN(Number(value));
  if (t === "boolean") return ["true", "false", "1", "0", "yes", "no", "on", "off"].includes(value.toLowerCase());
  if (t === "json") { try { JSON.parse(value); return true; } catch { return false; } }
  return true;
}

export default function RemoteConfigs() {
  const toast = useToast();
  const [configs, setConfigs] = useState<RemoteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<RemoteConfig | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RemoteConfig | null>(null);
  const [deleting, setDeleting] = useState(false);
  // test
  const [tKey, setTKey] = useState(""); const [tUser, setTUser] = useState(""); const [tTraits, setTTraits] = useState("");
  const [tResult, setTResult] = useState<any>(null);
  // segments modal
  const [segFor, setSegFor] = useState<RemoteConfig | null>(null);
  const [segs, setSegs] = useState<ConfigSegment[]>([]);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/configs?limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setConfigs(await res.json()); setError("");
    } catch { setError("Couldn't load configs. Is the API running? Try again."); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchConfigs(); }, []);
  useEffect(() => { if (segFor) fetch(`${API}/configs/${segFor.id}/segments`).then((r) => r.json()).then(setSegs).catch(() => setSegs([])); }, [segFor]);

  const startCreate = () => { setEditing({ id: 0, key: "", description: "", value_type: "string", default_value: "", created_at: "", updated_at: "" }); setCreateMode(true); };
  const up = (f: keyof RemoteConfig, v: any) => editing && setEditing({ ...editing, [f]: v });

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const url = createMode ? `${API}/configs` : `${API}/configs/${editing.id}`;
      const res = await fetch(url, { method: createMode ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editing.key, description: editing.description, value_type: editing.value_type, default_value: editing.default_value }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.push("error", d.detail || "Save failed."); return; }
      toast.push("success", `${createMode ? "Created" : "Updated"} “${editing.key}”.`);
      setEditing(null); setCreateMode(false); fetchConfigs();
    } finally { setSaving(false); }
  }
  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/configs/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.push("error", d.detail || "Delete failed."); }
      else toast.push("success", `Deleted “${deleteTarget.key}”.`);
      setDeleteTarget(null); fetchConfigs();
    } finally { setDeleting(false); }
  }
  async function test() {
    if (!tKey || !tUser) { toast.push("error", "Provide a config key and user ID."); return; }
    try {
      const res = await fetch(`${API}/configs/evaluate/${encodeURIComponent(tKey)}?user_id=${encodeURIComponent(tUser)}${tTraits ? `&${tTraits}` : ""}`);
      if (!res.ok) throw new Error();
      setTResult(await res.json());
    } catch { toast.push("error", "Evaluation failed — check the key and user."); setTResult(null); }
  }

  // ---- form ----
  if (editing) {
    const valid = validate(editing.default_value, editing.value_type);
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-default bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-content">{createMode ? "Create config" : `Edit “${editing.key}”`}</h2>
          <button onClick={() => { setEditing(null); setCreateMode(false); }} aria-label="Close" className="rounded p-1 text-content-subtle hover:bg-surface-2 hover:text-content">✕</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Config key *</label>
            <input className={input} value={editing.key} onChange={(e) => up("key", e.target.value)} placeholder="e.g. api_timeout" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Description</label>
            <textarea rows={2} className={input} value={editing.description || ""} onChange={(e) => up("description", e.target.value)} placeholder="What does this control?" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Value type *</label>
            <select className={input} value={editing.value_type} onChange={(e) => up("value_type", e.target.value)}>
              <option value="string">Text</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Default value *</label>
            {editing.value_type === "boolean" ? (
              <select className={input} value={editing.default_value} onChange={(e) => up("default_value", e.target.value)}>
                <option value="true">true</option><option value="false">false</option>
              </select>
            ) : editing.value_type === "json" ? (
              <textarea rows={5} className={`${input} font-mono`} value={editing.default_value} onChange={(e) => up("default_value", e.target.value)} placeholder='{"limit": 100}' />
            ) : (
              <input type={editing.value_type === "number" ? "number" : "text"} className={input} value={editing.default_value} onChange={(e) => up("default_value", e.target.value)} placeholder={editing.value_type === "number" ? "123" : "value"} />
            )}
            {!valid && editing.default_value ? <p className="mt-1 text-sm text-danger">Not a valid {editing.value_type} value.</p> : null}
          </div>
        </div>
        <div className="mt-6 flex gap-2 border-t border-default pt-5">
          <Button variant="primary" onClick={save} disabled={saving || !editing.key.trim() || !valid}>{saving ? "Saving…" : createMode ? "Create config" : "Save changes"}</Button>
          <Button variant="secondary" onClick={() => { setEditing(null); setCreateMode(false); }} disabled={saving}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ---- list ----
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-lg border border-default bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-default px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-content">Remote Configs</h2>
            <p className="text-xs text-content-muted">Typed configuration values with per-segment overrides.</p>
          </div>
          <Button variant="primary" onClick={startCreate}>+ Create config</Button>
        </div>

        {/* Test */}
        <div className="border-b border-default bg-surface-2 px-4 py-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-content-subtle">Evaluate a config for a user</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <input className={input} placeholder="config key" value={tKey} onChange={(e) => setTKey(e.target.value)} />
            <input className={input} placeholder="user id" value={tUser} onChange={(e) => setTUser(e.target.value)} />
            <input className={input} placeholder="traits (country=US&plan=premium)" value={tTraits} onChange={(e) => setTTraits(e.target.value)} />
            <Button variant="primary" onClick={test}>Evaluate</Button>
          </div>
          {tResult && <pre className="mt-3 overflow-x-auto rounded-md border border-default bg-surface p-3 text-xs text-content">{JSON.stringify(tResult, null, 2)}</pre>}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : error ? (
            <div className="py-10 text-center"><p className="text-sm text-danger">{error}</p><div className="mt-3"><Button onClick={fetchConfigs}>Retry</Button></div></div>
          ) : configs.length === 0 ? (
            <EmptyState icon="⚙️" title="No configs yet" hint="Create a config to store dynamic, typed values for your app." action={<Button variant="primary" onClick={startCreate}>Create your first config</Button>} />
          ) : (
            <div className="space-y-3">
              {configs.map((c) => (
                <div key={c.id} className="rounded-md border border-default p-4 hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-content">{c.key}</h3>
                        <StatusBadge tone="neutral">{TYPE_LABEL[c.value_type]}</StatusBadge>
                      </div>
                      {c.description && <p className="mb-2 line-clamp-1 text-sm text-content-muted">{c.description}</p>}
                      <div className="truncate rounded border border-default bg-surface-2 px-2 py-1 font-mono text-xs text-content-muted" title={c.default_value}>
                        default = {c.default_value}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setSegFor(c)}>Segments</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setEditing({ ...c }); setCreateMode(false); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(c)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Segments modal */}
      {segFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setSegFor(null); }}>
          <div role="dialog" aria-modal="true" className="mt-10 w-full max-w-2xl rounded-lg border border-default bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-default px-5 py-3">
              <h3 className="font-semibold text-content">Segment overrides — {segFor.key}</h3>
              <button onClick={() => setSegFor(null)} aria-label="Close" className="rounded p-1 text-content-subtle hover:bg-surface-2 hover:text-content">✕</button>
            </div>
            <div className="p-5">
              {segs.length === 0 ? (
                <EmptyState icon="🎯" title="No segment overrides" hint="This config returns its default value for everyone." />
              ) : (
                <div className="space-y-2">
                  {segs.map((cs) => (
                    <div key={cs.id} className="flex items-start justify-between rounded-md border border-default p-3">
                      <div>
                        <div className="font-medium text-content">{cs.segment.name}</div>
                        <div className="text-xs text-content-muted">priority {cs.priority}</div>
                        <div className="mt-1 rounded border border-default bg-surface-2 px-2 py-1 font-mono text-xs text-content-muted">{cs.value}</div>
                      </div>
                      <StatusBadge tone={cs.enabled ? "on" : "off"}>{cs.enabled ? "Enabled" : "Disabled"}</StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} danger busy={deleting} title={deleteTarget ? `Delete “${deleteTarget.key}”?` : ""} confirmLabel="Delete config"
        onConfirm={doDelete} onCancel={() => setDeleteTarget(null)}>
        <p>This removes the config and its segment overrides. Clients reading this key will get their fallback. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  );
}
