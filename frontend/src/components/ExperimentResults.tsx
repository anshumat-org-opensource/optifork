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
        setError(err.message);
      }
    };

    fetchResults();
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-medium text-gray-900">Experiment Results</h2>
      </div>
      <div className="p-6">

        {error && <div className="text-gray-700 mb-4">{error}</div>}

        {results.length === 0 ? (
          <div>No experiment data available.</div>
        ) : (
          results.map((exp) => (
            <div key={exp.id} className="mb-6 p-4 border bg-gray-50">
              <h3 className="text-lg font-medium">{exp.name}</h3>
              <p className="text-sm text-gray-700">{exp.description}</p>
              <p className="text-sm text-gray-600 mb-2">Status: {exp.status}</p>

              <table className="w-full text-sm border mt-2">
                <thead>
                  <tr className="bg-gray-100">
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
    </div>
  );
}

export default ExperimentResults;
