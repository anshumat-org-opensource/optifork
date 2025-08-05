import { useEffect, useState } from "react";

interface Variant {
  id: number;
  name: string;
  traffic_split: number;
}

interface Experiment {
  id: number;
  name: string;
  description: string;
  status: string;
  flag_id?: number;
  variants: Variant[];
}

function ListExperiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const res = await fetch("http://localhost:8000/experiments");
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to load experiments");
        setExperiments(data);
      } catch (err: any) {
        setError("❌ " + err.message);
      }
    };

    fetchExperiments();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">All Experiments</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {experiments.length === 0 ? (
        <div>No experiments found.</div>
      ) : (
        experiments.map((exp) => (
          <div
            key={exp.id}
            className="mb-4 p-4 border rounded bg-gray-50 shadow-sm"
          >
            <h3 className="text-lg font-bold">{exp.name}</h3>
            <p className="text-sm text-gray-700">{exp.description}</p>
            <p className="text-sm text-gray-600 italic mb-1">Status: {exp.status}</p>
            {exp.flag_id !== undefined && (
              <p className="text-sm text-blue-600">🔗 Linked to Flag ID: {exp.flag_id}</p>
            )}

            <div className="mt-2">
              <strong>Variants:</strong>
              <ul className="list-disc list-inside ml-4">
                {exp.variants.map((variant) => (
                  <li key={variant.id}>
                    <span className="font-medium">{variant.name}</span> —{" "}
                    {variant.traffic_split * 100}%
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ListExperiments;
