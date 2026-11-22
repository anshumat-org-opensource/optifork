import { useEffect, useState } from "react";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";

interface VariantResult { id: number; name: string; traffic_split: number; assignments: number; exposures: number; }
interface ExperimentResult { id: number; name: string; description: string; status: string; variants: VariantResult[]; }

const API = "http://localhost:8000";
const statusTone = (s: string): "on" | "partial" | "neutral" => (s === "active" ? "on" : s === "paused" ? "partial" : "neutral");

export default function ExperimentResults() {
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/experiments/results`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResults(await res.json());
    } catch {
      setError("Couldn't load results. Is the API running? Try again.");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-lg border border-default bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-default px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-content">Experiment Results</h2>
            <p className="text-xs text-content-muted">Assignments and exposures per variant.</p>
          </div>
          <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : error ? (
            <div className="py-10 text-center"><p className="text-sm text-danger">{error}</p><div className="mt-3"><Button onClick={load}>Retry</Button></div></div>
          ) : results.length === 0 ? (
            <EmptyState icon="📊" title="No experiment data yet" hint="Results appear once users are assigned and exposed to variants." />
          ) : (
            <div className="space-y-4">
              {results.map((exp) => (
                <div key={exp.id} className="overflow-hidden rounded-md border border-default">
                  <div className="flex flex-wrap items-center gap-2 border-b border-default bg-surface-2 px-4 py-2.5">
                    <h3 className="font-semibold text-content">{exp.name}</h3>
                    <StatusBadge tone={statusTone(exp.status)}>{exp.status}</StatusBadge>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-content-subtle">
                        <th className="px-4 py-2 font-medium">Variant</th>
                        <th className="px-4 py-2 text-right font-medium">Split</th>
                        <th className="px-4 py-2 text-right font-medium">Assignments</th>
                        <th className="px-4 py-2 text-right font-medium">Exposures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exp.variants.map((v) => (
                        <tr key={v.id} className="border-t border-default">
                          <td className="px-4 py-2 font-medium text-content">{v.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-content-muted">{(v.traffic_split * 100).toFixed(1)}%</td>
                          <td className="px-4 py-2 text-right tabular-nums text-content">{v.assignments.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-content">{v.exposures.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
