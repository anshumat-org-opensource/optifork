import { useEffect, useState } from "react";

interface VariantResult {
  id: number;
  name: string;
  traffic_split: number;
  assignments: number;
  exposures: number;
}

interface ExperimentResult {
  id: number;
  name: string;
  description: string;
  status: string;
  variants: VariantResult[];
}

function ExperimentResults() {
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch("http://localhost:8000/experiments/results");
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to fetch results");
        setResults(data);
      } catch (err: any) {
        setError("❌ " + err.message);
      }
    };

    fetchResults();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6">📊 Experiment Results</h2>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {results.length === 0 ? (
        <div>No experiment data available.</div>
      ) : (
        results.map((exp) => (
          <div key={exp.id} className="mb-6 p-4 border rounded bg-gray-50 shadow-sm">
            <h3 className="text-lg font-semibold">{exp.name}</h3>
            <p className="text-sm text-gray-700">{exp.description}</p>
            <p className="text-sm text-gray-600 italic mb-2">Status: {exp.status}</p>

            <table className="w-full text-sm border mt-2">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-left">Variant</th>
                  <th className="p-2 text-right">Traffic Split (%)</th>
                  <th className="p-2 text-right">Assignments</th>
                  <th className="p-2 text-right">Exposures</th>
                </tr>
              </thead>
              <tbody>
                {exp.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="p-2">{v.name}</td>
                    <td className="p-2 text-right">{(v.traffic_split * 100).toFixed(2)}</td>
                    <td className="p-2 text-right">{v.assignments}</td>
                    <td className="p-2 text-right">{v.exposures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default ExperimentResults;
