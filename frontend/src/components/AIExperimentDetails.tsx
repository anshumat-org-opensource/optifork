import { useState, useEffect } from "react";

interface AIExperiment {
  id: number;
  name: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  prompt_configs: PromptConfig[];
  model_configs: ModelConfig[];
  evaluation_datasets: EvaluationDataset[];
  evaluation_runs: EvaluationRun[];
}

interface PromptConfig {
  id: number;
  name: string;
  version: string;
  prompt_template: string;
  system_message?: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
}

interface ModelConfig {
  id: number;
  name: string;
  provider: string;
  model_name: string;
  api_key_name?: string;
  base_url?: string;
  is_active: boolean;
}

interface EvaluationDataset {
  id: number;
  name: string;
  description?: string;
  dataset_type: string;
  sample_count: number;
  file_path?: string;
}

interface EvaluationRun {
  id: number;
  name: string;
  status: string;
  total_samples: number;
  completed_samples: number;
  average_latency?: number;
  total_cost?: number;
  started_at?: string;
  completed_at?: string;
}

export default function AIExperimentDetails() {
  const [experiments, setExperiments] = useState<AIExperiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<AIExperiment | null>(null);
  const [activeTab, setActiveTab] = useState<"prompts" | "models" | "datasets" | "evaluate">("prompts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states
  const [promptForm, setPromptForm] = useState({
    name: "",
    prompt_template: "",
    system_message: "",
    temperature: 0.7,
    max_tokens: 1000,
  });

  const [editingPrompt, setEditingPrompt] = useState<PromptConfig | null>(null);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);

  const [modelForm, setModelForm] = useState({
    name: "",
    provider: "openai",
    model_name: "",
    api_key_name: "",
  });

  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [datasetForm, setDatasetForm] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchExperiments();
  }, []);

  const fetchExperiments = async () => {
    try {
      const response = await fetch("http://localhost:8000/ai-experiments/");
      if (response.ok) {
        const data = await response.json();
        setExperiments(data);
        if (data.length > 0 && !selectedExperiment) {
          fetchExperimentDetails(data[0].id);
        }
      } else {
        setError("Failed to fetch experiments");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
    setLoading(false);
  };

  const fetchExperimentDetails = async (experimentId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/${experimentId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedExperiment(data);
      }
    } catch (error) {
      setError("Failed to fetch experiment details");
    }
  };

  const createPromptConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExperiment) return;

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/${selectedExperiment.id}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptForm),
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment.id);
        setPromptForm({ name: "", prompt_template: "", system_message: "", temperature: 0.7, max_tokens: 1000 });
      } else {
        setError("Failed to create prompt configuration");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const startEditPrompt = (prompt: PromptConfig) => {
    setEditingPrompt(prompt);
    setPromptForm({
      name: prompt.name,
      prompt_template: prompt.prompt_template,
      system_message: prompt.system_message || "",
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });
  };

  const updatePromptConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt) return;

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/prompt/${editingPrompt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...promptForm, version: editingPrompt.version }),
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment!.id);
        setEditingPrompt(null);
        setPromptForm({ name: "", prompt_template: "", system_message: "", temperature: 0.7, max_tokens: 1000 });
      } else {
        setError("Failed to update prompt configuration");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const deletePromptConfig = async (promptId: number) => {
    if (!confirm("Are you sure you want to delete this prompt configuration?")) return;

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/prompt/${promptId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment!.id);
      } else {
        setError("Failed to delete prompt configuration");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const startEditModel = (model: ModelConfig) => {
    setEditingModel(model);
    setModelForm({
      name: model.name,
      provider: model.provider,
      model_name: model.model_name,
      api_key_name: model.api_key_name || "",
    });
  };

  const updateModelConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/model/${editingModel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelForm),
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment!.id);
        setEditingModel(null);
        setModelForm({ name: "", provider: "openai", model_name: "", api_key_name: "" });
      } else {
        setError("Failed to update model configuration");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const deleteModelConfig = async (modelId: number) => {
    if (!confirm("Are you sure you want to delete this model configuration?")) return;

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/model/${modelId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment!.id);
      } else {
        setError("Failed to delete model configuration");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const cancelEditModel = () => {
    setEditingModel(null);
    setModelForm({ name: "", provider: "openai", model_name: "", api_key_name: "" });
  };

  const cancelEditPrompt = () => {
    setEditingPrompt(null);
    setPromptForm({ name: "", prompt_template: "", system_message: "", temperature: 0.7, max_tokens: 1000 });
  };

  const createModelConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExperiment) return;

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/${selectedExperiment.id}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelForm),
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment.id);
        setModelForm({ name: "", provider: "openai", model_name: "", api_key_name: "" });
      } else {
        setError("Failed to create model configuration");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  const uploadDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExperiment || !datasetFile) return;

    const formData = new FormData();
    formData.append("file", datasetFile);
    formData.append("name", datasetForm.name || datasetFile.name);
    formData.append("description", datasetForm.description);

    try {
      const response = await fetch(`http://localhost:8000/ai-experiments/${selectedExperiment.id}/datasets/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        fetchExperimentDetails(selectedExperiment.id);
        setDatasetFile(null);
        setDatasetForm({ name: "", description: "" });
      } else {
        setError("Failed to upload dataset");
      }
    } catch (error) {
      setError("Failed to connect to server");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-4xl mb-4">🤖</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No AI experiments found</h3>
        <p className="text-gray-600">Create an AI experiment first in the Manage tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Experiment Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configure AI Experiment</h2>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Select Experiment:</label>
          <select
            value={selectedExperiment?.id || ""}
            onChange={(e) => {
              const experimentId = parseInt(e.target.value);
              fetchExperimentDetails(experimentId);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedExperiment && (
        <div className="bg-white rounded-lg shadow">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {["prompts", "models", "datasets", "evaluate"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Prompts Tab */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Prompt Configurations</h3>
                  
                  <form onSubmit={editingPrompt ? updatePromptConfig : createPromptConfig} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={promptForm.name}
                          onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={promptForm.temperature}
                          onChange={(e) => setPromptForm({ ...promptForm, temperature: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Template</label>
                      <textarea
                        value={promptForm.prompt_template}
                        onChange={(e) => setPromptForm({ ...promptForm, prompt_template: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="You are a helpful assistant. Answer the following question: {question}"
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {editingPrompt ? "Update Prompt Config" : "Add Prompt Config"}
                      </button>
                      {editingPrompt && (
                        <button
                          type="button"
                          onClick={cancelEditPrompt}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-3">
                    {selectedExperiment.prompt_configs.map((config) => (
                      <div key={config.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{config.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{config.prompt_template}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              Temperature: {config.temperature} | Max Tokens: {config.max_tokens}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => startEditPrompt(config)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deletePromptConfig(config.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Models Tab */}
            {activeTab === "models" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Model Configurations</h3>
                  
                  <form onSubmit={editingModel ? updateModelConfig : createModelConfig} className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={modelForm.name}
                          onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                        <select
                          value={modelForm.provider}
                          onChange={(e) => setModelForm({ ...modelForm, provider: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="google">Google</option>
                          <option value="mistral">Mistral</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                      <input
                        type="text"
                        value={modelForm.model_name}
                        onChange={(e) => setModelForm({ ...modelForm, model_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., gpt-4, claude-3-sonnet"
                        required
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {editingModel ? "Update Model Config" : "Add Model Config"}
                      </button>
                      {editingModel && (
                        <button
                          type="button"
                          onClick={cancelEditModel}
                          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-3">
                    {selectedExperiment.model_configs.map((config) => (
                      <div key={config.id} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{config.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {config.provider} - {config.model_name}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => startEditModel(config)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteModelConfig(config.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Datasets Tab */}
            {activeTab === "datasets" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Evaluation Datasets</h3>
                  
                  <form onSubmit={uploadDataset} className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dataset File</label>
                      <input
                        type="file"
                        accept=".json,.jsonl,.csv"
                        onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Supported formats: JSON, JSONL, CSV</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                      <input
                        type="text"
                        value={datasetForm.name}
                        onChange={(e) => setDatasetForm({ ...datasetForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Auto-generated from filename"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!datasetFile}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Upload Dataset
                    </button>
                  </form>

                  <div className="space-y-3">
                    {selectedExperiment.evaluation_datasets.map((dataset) => (
                      <div key={dataset.id} className="border border-gray-200 rounded-md p-4">
                        <h4 className="font-medium text-gray-900">{dataset.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          Type: {dataset.dataset_type} | Samples: {dataset.sample_count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Evaluate Tab */}
            {activeTab === "evaluate" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Run Evaluation</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">Evaluation Setup</h4>
                  <p className="text-sm text-yellow-700">
                    Configure your prompts, models, and datasets first, then return here to run evaluations.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Prompts</h4>
                    <p className="text-2xl font-bold text-blue-600">{selectedExperiment.prompt_configs.length}</p>
                    <p className="text-sm text-gray-600">configured</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Models</h4>
                    <p className="text-2xl font-bold text-green-600">{selectedExperiment.model_configs.length}</p>
                    <p className="text-sm text-gray-600">configured</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Datasets</h4>
                    <p className="text-2xl font-bold text-purple-600">{selectedExperiment.evaluation_datasets.length}</p>
                    <p className="text-sm text-gray-600">uploaded</p>
                  </div>
                </div>

                {selectedExperiment.evaluation_runs.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Recent Evaluation Runs</h4>
                    <div className="space-y-2">
                      {selectedExperiment.evaluation_runs.map((run) => (
                        <div key={run.id} className="border border-gray-200 rounded-md p-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-gray-900">{run.name}</h5>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              run.status === 'completed' ? 'bg-green-100 text-green-800' :
                              run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                              run.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {run.status}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            Progress: {run.completed_samples}/{run.total_samples}
                            {run.average_latency && ` | Avg Latency: ${run.average_latency}ms`}
                            {run.total_cost && ` | Cost: $${run.total_cost.toFixed(4)}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}