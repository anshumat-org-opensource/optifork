import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { SkeletonRows } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { VirtualList } from "../ui/VirtualList";

interface FlagExposure {
  id: number;
  flag_name: string;
  user_id: string;
  enabled: boolean;
  timestamp: string;
}

const API = "http://localhost:8000";
const ROW_H = 56;

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-default bg-surface-2 px-4 py-3">
      <div className="text-xl font-semibold tabular-nums text-content">{value}</div>
      <div className="text-xs text-content-muted">{label}</div>
    </div>
  );
}

export default function FlagExposures({ selectedFlag }: { selectedFlag?: string }) {
  const [exposures, setExposures] = useState<FlagExposure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(selectedFlag || "");
  const [flags, setFlags] = useState<string[]>([]);

  async function fetchExposures() {
    setLoading(true);
    setError("");
    try {
      const url = filter ? `${API}/flags/${encodeURIComponent(filter)}/exposures?limit=100` : `${API}/exposures?limit=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExposures(await res.json());
    } catch {
      setError("Couldn't load exposures. Is the API running? Try Refresh.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch(`${API}/flags?limit=500`).then((r) => r.json()).then((f) => setFlags(f.map((x: any) => x.name))).catch(() => {});
  }, []);
  useEffect(() => { fetchExposures(); /* eslint-disable-next-line */ }, [filter]);
  useEffect(() => { if (selectedFlag) setFilter(selectedFlag); }, [selectedFlag]);

  const enabled = exposures.filter((e) => e.enabled).length;
  const rate = exposures.length ? ((enabled / exposures.length) * 100).toFixed(1) : "0";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-lg border border-default bg-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-default px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-content">Flag Exposures</h2>
            <p className="text-xs text-content-muted">Who a flag was evaluated for, and whether it was on.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="text-xs text-content-muted">
              <span className="mb-1 block">Flag</span>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}
                className="w-56 rounded-md border border-strong bg-surface px-3 py-2 text-sm text-content focus:border-primary focus:outline-none">
                <option value="">All flags</option>
                {flags.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <Button onClick={fetchExposures} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          </div>
        </div>

        {!loading && exposures.length > 0 && (
          <div className="grid grid-cols-2 gap-3 border-b border-default px-4 py-3 md:grid-cols-4">
            <Stat label="Exposures (recent)" value={exposures.length} />
            <Stat label="Enabled" value={enabled} />
            <Stat label="Disabled" value={exposures.length - enabled} />
            <Stat label="Enabled rate" value={`${rate}%`} />
          </div>
        )}

        <div className="flex items-center gap-4 border-b border-default bg-surface-2 px-4 py-2 text-xs font-medium uppercase tracking-wide text-content-subtle">
          <span className="flex-1">Flag</span>
          <span className="w-56">User</span>
          <span className="w-24 text-center">Result</span>
          <span className="w-44 text-right">Time</span>
        </div>

        {loading ? (
          <SkeletonRows rows={6} rowHeight={ROW_H} />
        ) : error ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <div className="mt-3"><Button onClick={fetchExposures}>Retry</Button></div>
          </div>
        ) : exposures.length === 0 ? (
          <EmptyState icon="📡" title={filter ? `No exposures for “${filter}”` : "No exposures yet"} hint="Exposures are logged whenever a flag is evaluated for a user." />
        ) : (
          <VirtualList
            items={exposures}
            rowHeight={ROW_H}
            height={Math.min(exposures.length, 9) * ROW_H + 8}
            renderRow={(e) => (
              <div className="flex h-full items-center gap-4 border-b border-default px-4 hover:bg-surface-2">
                <div className="min-w-0 flex-1 truncate font-medium text-content" title={e.flag_name}>{e.flag_name}</div>
                <div className="w-56 truncate text-sm text-content-muted" title={e.user_id}>{e.user_id}</div>
                <div className="w-24 text-center"><StatusBadge tone={e.enabled ? "on" : "off"}>{e.enabled ? "On" : "Off"}</StatusBadge></div>
                <div className="w-44 text-right text-xs tabular-nums text-content-subtle">{new Date(e.timestamp).toLocaleString()}</div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
