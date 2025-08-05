import { useEffect, useState } from "react";

interface FeatureFlag {
  name: string;
  description?: string;
  rollout: number;
}

function ListFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/flags")
      .then((res) => res.json())
      .then(setFlags)
      .catch((err) => setError("❌ Failed to fetch flags"));
  }, []);

  return (
    <div className="max-w-4xl p-4 bg-white shadow rounded">
      <h2 className="text-xl font-semibold mb-4">Feature Flags</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}

      {flags.length === 0 ? (
        <p className="text-gray-500">No feature flags found.</p>
      ) : (
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border px-4 py-2">Name</th>
              <th className="border px-4 py-2">Description</th>
              <th className="border px-4 py-2">Rollout</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag, i) => (
              <tr key={i}>
                <td className="border px-4 py-2">{flag.name}</td>
                <td className="border px-4 py-2">{flag.description || "-"}</td>
                <td className="border px-4 py-2">{flag.rollout}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ListFlags;
