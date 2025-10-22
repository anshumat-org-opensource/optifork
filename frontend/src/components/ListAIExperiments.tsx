import { useState, useEffect } from "react";

interface AIExperiment {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export default function ListAIExperiments() {
  const [experiments, setExperiments] = useState<AIExperiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedExperiment, setSelectedExperiment] = useState<AIExperiment | null>(null);

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    try {
      const response = await fetch("http://localhost:8000/ai-experiments/");
      if (response.ok) {
        const data = await response.json();
        setExperiments(data);
      } else {
        setError("Failed to fetch AI experiments");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
    setLoading(false);
  };

  const updateStatus = async (experimentId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/${experimentId}/status?status=${newStatus}`, {
        method: "PUT",
      });
      if (response.ok) {
        fetchExperiments(); // Refresh the list
      } else {
        setError("Failed to update experiment status");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "archived": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">AI Experiments</h2>
        <p className="text-sm text-gray-600">Manage your AI prompt and model experiments</p>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {experiments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI experiments yet</h3>
            <p className="text-gray-600">Create your first AI experiment to start testing prompts and models.</p>
          </div>
        ) : (
          experiments.map((experiment) => (
            <div key={experiment.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{experiment.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
                      {experiment.status}
                    </span>
                  </div>
                  {experiment.description && (
                    <p className="mt-1 text-sm text-gray-600">{experiment.description}</p>
                  )}
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Created: {formatDate(experiment.created_at)}</span>
                    {experiment.updated_at && (
                      <span>Updated: {formatDate(experiment.updated_at)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={experiment.status}
                    onChange={(e) => updateStatus(experiment.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                  
                  <button
                    onClick={() => setSelectedExperiment(experiment)}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Configure
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick stats footer */}
      {experiments.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total experiments: {experiments.length}</span>
            <div className="flex space-x-4">
              <span>Draft: {experiments.filter(e => e.status === 'draft').length}</span>
              <span>Running: {experiments.filter(e => e.status === 'running').length}</span>
              <span>Completed: {experiments.filter(e => e.status === 'completed').length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Experiment details modal (placeholder) */}
      {selectedExperiment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Configure: {selectedExperiment.name}</h3>
              <button
                onClick={() => setSelectedExperiment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Configuration Options</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Add prompt configurations</li>
                    <li>• Configure model settings</li>
                    <li>• Upload evaluation datasets</li>
                    <li>• Run evaluations and view results</li>
                  </ul>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Full experiment configuration will be available in the Evaluate tab.</p>
                  <button
                    onClick={() => setSelectedExperiment(null)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}