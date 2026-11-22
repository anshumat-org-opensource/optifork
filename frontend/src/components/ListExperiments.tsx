import { useEffect, useState } from "react";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";

interface Variant { id: number; name: string; traffic_split: number; }
interface Experiment { id: number; name: string; description: string; status: string; flag_id?: number; variants: Variant[]; }
interface Flag { id: number; name: string; }

const API = "http://localhost:8000";

function statusTone(s: string): "on" | "partial" | "neutral" {
  if (s === "active") return "on";
  if (s === "paused") return "partial";
  return "neutral";
}

export default function ListExperiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [er, fr] = await Promise.all([fetch(`${API}/experiments/`), fetch(`${API}/flags?limit=500`)]);
      if (!er.ok) throw new Error(`HTTP ${er.status}`);
      setExperiments(await er.json());
      if (fr.ok) setFlags(await fr.json());
    } catch {
      setError("Couldn't load experiments. Is the API running? Try again.");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const flagName = (id?: number) => (id ? flags.find((f) => f.id === id)?.name || `Flag #${id}` : null);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-lg border border-default bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-default px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-content">Experiments</h2>
            <p className="text-xs text-content-muted">A/B tests and their variant splits.</p>
          </div>
          <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
          ) : error ? (
            <div className="py-10 text-center"><p className="text-sm text-danger">{error}</p><div className="mt-3"><Button onClick={load}>Retry</Button></div></div>
          ) : experiments.length === 0 ? (
            <EmptyState icon="🧪" title="No experiments yet" hint="Create one from the form above to start A/B testing." />
          ) : (
            <div className="space-y-3">
              {experiments.map((exp) => (
                <div key={exp.id} className="rounded-md border border-default p-4 hover:bg-surface-2">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-content">{exp.name}</h3>
                    <StatusBadge tone={statusTone(exp.status)}>{exp.status}</StatusBadge>
                    {flagName(exp.flag_id) && <span className="text-xs text-content-muted">gated by <span className="font-medium text-content">{flagName(exp.flag_id)}</span></span>}
                  </div>
                  {exp.description && <p className="mb-3 line-clamp-2 text-sm text-content-muted">{exp.description}</p>}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {exp.variants.map((v) => {
                      const pct = v.traffic_split * 100;
                      return (
                        <div key={v.id} className="rounded-md bg-surface-2 p-3">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium text-content">{v.name}</span>
                            <span className="text-sm tabular-nums text-content-muted">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
