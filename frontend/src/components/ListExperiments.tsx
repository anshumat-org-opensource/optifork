import { useEffect, useState } from "react";

interface Variant {
  id: number;
  name: string;
  traffic_split: number;
}

interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  rollout: number;
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
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch experiments and flags in parallel
        const [experimentsRes, flagsRes] = await Promise.all([
          fetch("http://localhost:8000/experiments"),
          fetch("http://localhost:8000/flags")
        ]);

        if (experimentsRes.ok) {
          const experimentsData = await experimentsRes.json();
          setExperiments(experimentsData);
        }

        if (flagsRes.ok) {
          const flagsData = await flagsRes.json();
          setFlags(flagsData);
        }

        if (!experimentsRes.ok) {
          const data = await experimentsRes.json();
          throw new Error(data.detail || "Failed to load experiments");
        }
      } catch (err: any) {
        setError("❌ " + err.message);
      }
    };

    fetchData();
  }, []);

  const getFlagName = (flagId?: number) => {
    if (!flagId) return null;
    const flag = flags.find(f => f.id === flagId);
    return flag ? flag.name : `Flag #${flagId}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">📊</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Active Experiments</h2>
              <p className="text-green-100 text-sm">Manage and monitor your A/B tests</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {experiments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧪</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Experiments Yet</h3>
              <p className="text-gray-600">Create your first experiment to get started with A/B testing</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {experiments.map((exp) => (
                <div key={exp.id} className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{exp.name}</h3>
                        {exp.description && (
                          <p className="text-gray-600 mb-2">{exp.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            exp.status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : exp.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {exp.status}
                          </span>
                          {getFlagName(exp.flag_id) && (
                            <div className="flex items-center space-x-1 text-blue-600">
                              <span>🔗</span>
                              <span className="font-medium">{getFlagName(exp.flag_id)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Variants & Traffic Split</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {exp.variants.map((variant) => (
                          <div key={variant.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-800">{variant.name}</h5>
                              <span className="text-lg font-bold text-green-600">
                                {(variant.traffic_split * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${variant.traffic_split * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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

export default ListExperiments;
