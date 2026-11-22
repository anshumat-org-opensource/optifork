import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";

export interface SegmentCondition { field: string; operator: string; value: any; }
export interface UserSegment {
  id: number; name: string; description?: string; conditions: SegmentCondition[]; created_at: string; updated_at: string;
}

const API = "http://localhost:8000";
const input = "w-full rounded-md border border-strong bg-surface px-3 py-2 text-sm text-content placeholder:text-content-subtle focus:border-primary focus:outline-none";

const OPERATORS: Record<string, string> = {
  equals: "equals", not_equals: "does not equal", contains: "contains", not_contains: "does not contain",
  in: "is one of", not_in: "is not one of", greater_than: "is greater than", less_than: "is less than",
  greater_than_or_equal: "≥", less_than_or_equal: "≤", starts_with: "starts with", ends_with: "ends with",
};

export default function UserSegments() {
  const toast = useToast();
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<UserSegment | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserSegment | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchSegments() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/segments?limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSegments(await res.json()); setError("");
    } catch { setError("Couldn't load segments. Is the API running? Try again."); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchSegments(); }, []);

  const startCreate = () => { setEditing({ id: 0, name: "", description: "", conditions: [], created_at: "", updated_at: "" }); setCreateMode(true); };
  const up = (f: keyof UserSegment, v: any) => editing && setEditing({ ...editing, [f]: v });
  const addCond = () => editing && setEditing({ ...editing, conditions: [...editing.conditions, { field: "", operator: "equals", value: "" }] });
  const rmCond = (i: number) => editing && setEditing({ ...editing, conditions: editing.conditions.filter((_, x) => x !== i) });
  const upCond = (i: number, f: keyof SegmentCondition, v: any) => {
    if (!editing) return; const c = [...editing.conditions]; c[i][f] = v; setEditing({ ...editing, conditions: c });
  };

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const url = createMode ? `${API}/segments` : `${API}/segments/${editing.id}`;
      const res = await fetch(url, { method: createMode ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name, description: editing.description, conditions: editing.conditions }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.push("error", d.detail || "Save failed."); return; }
      toast.push("success", `${createMode ? "Created" : "Updated"} “${editing.name}”.`);
      setEditing(null); setCreateMode(false); fetchSegments();
    } finally { setSaving(false); }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/segments/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.push("error", d.detail || "Delete failed."); }
      else toast.push("success", `Deleted “${deleteTarget.name}”.`);
      setDeleteTarget(null); fetchSegments();
    } finally { setDeleting(false); }
  }

  // ---- edit / create form ----
  if (editing) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-default bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-content">{createMode ? "Create segment" : `Edit “${editing.name}”`}</h2>
          <button onClick={() => { setEditing(null); setCreateMode(false); }} aria-label="Close" className="rounded p-1 text-content-subtle hover:bg-surface-2 hover:text-content">✕</button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Segment name *</label>
            <input className={input} value={editing.name} onChange={(e) => up("name", e.target.value)} placeholder="e.g. Premium users" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-content">Description</label>
            <textarea rows={2} className={input} value={editing.description || ""} onChange={(e) => up("description", e.target.value)} placeholder="Who does this segment target?" />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-content">Conditions <span className="text-content-subtle">(all must match)</span></label>
              <Button size="sm" onClick={addCond}>+ Add condition</Button>
            </div>
            {editing.conditions.length === 0 ? (
              <div className="rounded-md border border-dashed border-strong bg-surface-2 px-4 py-6 text-center text-sm text-content-muted">
                No conditions — this segment matches <strong className="text-content">all users</strong>.
              </div>
            ) : (
              <div className="space-y-2">
                {editing.conditions.map((c, i) => (
                  <div key={i} className="rounded-md border border-default bg-surface-2 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-content-muted">
                      <span>Condition {i + 1}{i > 0 && <span className="ml-1 text-content-subtle">AND</span>}</span>
                      <button onClick={() => rmCond(i)} className="text-danger hover:text-danger-hover" aria-label={`Remove condition ${i + 1}`}>Remove</button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <input className={input} placeholder="field (e.g. country)" value={c.field} onChange={(e) => upCond(i, "field", e.target.value)} />
                      <select className={input} value={c.operator} onChange={(e) => upCond(i, "operator", e.target.value)}>
                        {Object.entries(OPERATORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      {c.operator === "in" || c.operator === "not_in" ? (
                        <input className={input} placeholder="a,b,c" value={Array.isArray(c.value) ? c.value.join(",") : c.value}
                          onChange={(e) => upCond(i, "value", e.target.value.split(",").map((v) => v.trim()).filter(Boolean))} />
                      ) : (
                        <input className={input} placeholder="value" value={c.value} onChange={(e) => upCond(i, "value", e.target.value)} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-2 border-t border-default pt-5">
          <Button variant="primary" onClick={save} disabled={saving || !editing.name.trim()}>{saving ? "Saving…" : createMode ? "Create segment" : "Save changes"}</Button>
          <Button variant="secondary" onClick={() => { setEditing(null); setCreateMode(false); }} disabled={saving}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ---- list ----
  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-lg border border-default bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-default px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-content">User Segments</h2>
            <p className="text-xs text-content-muted">Reusable targeting rules for flags and configs.</p>
          </div>
          <Button variant="primary" onClick={startCreate}>+ Create segment</Button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : error ? (
            <div className="py-10 text-center"><p className="text-sm text-danger">{error}</p><div className="mt-3"><Button onClick={fetchSegments}>Retry</Button></div></div>
          ) : segments.length === 0 ? (
            <EmptyState icon="👥" title="No segments yet" hint="Create a segment to target groups of users across flags and configs." action={<Button variant="primary" onClick={startCreate}>Create your first segment</Button>} />
          ) : (
            <div className="space-y-3">
              {segments.map((s) => (
                <div key={s.id} className="rounded-md border border-default p-4 hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-content">{s.name}</h3>
                        <StatusBadge tone={s.conditions.length ? "neutral" : "on"}>
                          {s.conditions.length ? `${s.conditions.length} condition${s.conditions.length !== 1 ? "s" : ""}` : "All users"}
                        </StatusBadge>
                      </div>
                      {s.description && <p className="mb-2 line-clamp-2 text-sm text-content-muted">{s.description}</p>}
                      {s.conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.conditions.map((c, i) => (
                            <span key={i} className="rounded border border-default bg-surface-2 px-2 py-0.5 font-mono text-xs text-content-muted">
                              <span className="text-primary">{c.field}</span> {OPERATORS[c.operator] || c.operator} <span className="text-success">{Array.isArray(c.value) ? `[${c.value.join(", ")}]` : String(c.value)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setEditing({ ...s }); setCreateMode(false); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(s)}>Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={!!deleteTarget} danger busy={deleting} title={deleteTarget ? `Delete “${deleteTarget.name}”?` : ""} confirmLabel="Delete segment"
        onConfirm={doDelete} onCancel={() => setDeleteTarget(null)}>
        <p>This removes the segment and any flag/config targeting that references it. This can't be undone.</p>
      </ConfirmDialog>
    </div>
  );
}
