import { useEffect, useState } from "react";

export interface RemoteConfig {
  id: number;
  key: string;
  description?: string;
  value_type: "string" | "number" | "boolean" | "json";
  default_value: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigSegment {
  id: number;
  config_id: number;
  segment_id: number;
  value: string;
  enabled: boolean;
  priority: number;
  segment: {
    id: number;
    name: string;
    description?: string;
    conditions: any[];
  };
}

function RemoteConfigs() {
  const [configs, setConfigs] = useState<RemoteConfig[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RemoteConfig | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [configSegments, setConfigSegments] = useState<ConfigSegment[]>([]);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [testConfigKey, setTestConfigKey] = useState("");
  const [testUserId, setTestUserId] = useState("");
  const [testUserTraits, setTestUserTraits] = useState("");
  const [testResult, setTestResult] = useState<any>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/configs");
      if (!res.ok) {
        throw new Error("Failed to fetch remote configs");
      }
      const data = await res.json();
      setConfigs(data);
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigSegments = async (configId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/configs/${configId}/segments`);
      if (!res.ok) {
        throw new Error("Failed to fetch config segments");
      }
      const data = await res.json();
      setConfigSegments(data);
    } catch (err: any) {
      setError("❌ " + err.message);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      fetchConfigSegments(selectedConfigId);
    }
  }, [selectedConfigId]);

  const handleEdit = (config: RemoteConfig) => {
    setEditingConfig({ ...config });
    setCreateMode(false);
  };

  const handleCreate = () => {
    setEditingConfig({
      id: 0,
      key: "",
      description: "",
      value_type: "string",
      default_value: "",
      created_at: "",
      updated_at: ""
    });
    setCreateMode(true);
  };

  const handleSave = async () => {
    if (!editingConfig) return;
    
    try {
      setLoading(true);
      const url = createMode 
        ? "http://localhost:8000/configs"
        : `http://localhost:8000/configs/${editingConfig.id}`;
      
      const method = createMode ? "POST" : "PUT";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editingConfig.key,
          description: editingConfig.description,
          value_type: editingConfig.value_type,
          default_value: editingConfig.default_value
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${createMode ? 'create' : 'update'} config`);
      }

      await fetchConfigs();
      setEditingConfig(null);
      setCreateMode(false);
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: number) => {
    if (!window.confirm("Are you sure you want to delete this config?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/configs/${configId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete config");
      }

      await fetchConfigs();
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfig = async () => {
    if (!testConfigKey || !testUserId) {
      setError("Please provide both config key and user ID");
      return;
    }

    try {
      const traits = testUserTraits ? `&${testUserTraits}` : "";
      const res = await fetch(
        `http://localhost:8000/configs/evaluate/${testConfigKey}?user_id=${testUserId}${traits}`
      );
      
      if (!res.ok) {
        throw new Error("Failed to evaluate config");
      }
      
      const result = await res.json();
      setTestResult(result);
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
      setTestResult(null);
    }
  };

  const updateEditingConfig = (field: keyof RemoteConfig, value: any) => {
    if (!editingConfig) return;
    setEditingConfig({ ...editingConfig, [field]: value });
  };

  const getValueTypeDisplay = (valueType: string) => {
    const types = {
      string: "Text",
      number: "Number", 
      boolean: "True/False",
      json: "JSON Object"
    };
    return types[valueType as keyof typeof types] || valueType;
  };

  const getValuePreview = (value: string, valueType: string) => {
    if (valueType === "json") {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return value;
      }
    }
    return value;
  };

  const validateValue = (value: string, valueType: string): boolean => {
    switch (valueType) {
      case "number":
        return !isNaN(Number(value));
      case "boolean":
        return ["true", "false", "1", "0", "yes", "no", "on", "off"].includes(value.toLowerCase());
      case "json":
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  };

  if (editingConfig) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-gray-900">
                  {createMode ? "Create Remote Config" : "Edit Remote Config"}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {createMode ? "Create a new configuration value" : "Update configuration settings"}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setCreateMode(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Config Key *</label>
                <input
                  type="text"
                  value={editingConfig.key}
                  onChange={(e) => updateEditingConfig("key", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="e.g., api_timeout, max_connections, feature_enabled"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use descriptive names like api_timeout, theme_color, etc.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingConfig.description || ""}
                  onChange={(e) => updateEditingConfig("description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Describe what this configuration controls..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value Type *</label>
                <select
                  value={editingConfig.value_type}
                  onChange={(e) => updateEditingConfig("value_type", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                >
                  <option value="string">String (Text)</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean (True/False)</option>
                  <option value="json">JSON Object</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Value *</label>
                {editingConfig.value_type === "boolean" ? (
                  <select
                    value={editingConfig.default_value}
                    onChange={(e) => updateEditingConfig("default_value", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : editingConfig.value_type === "json" ? (
                  <textarea
                    value={editingConfig.default_value}
                    onChange={(e) => updateEditingConfig("default_value", e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500 font-mono text-sm"
                    placeholder='{"key": "value", "number": 123, "enabled": true}'
                    required
                  />
                ) : (
                  <input
                    type={editingConfig.value_type === "number" ? "number" : "text"}
                    value={editingConfig.default_value}
                    onChange={(e) => updateEditingConfig("default_value", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                    placeholder={
                      editingConfig.value_type === "number" ? "123" :
                      editingConfig.value_type === "string" ? "Default text value" :
                      "Value"
                    }
                    required
                  />
                )}
                
                {!validateValue(editingConfig.default_value, editingConfig.value_type) && editingConfig.default_value && (
                  <p className="text-red-600 text-sm mt-1">Invalid value for {editingConfig.value_type} type</p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={handleSave}
                disabled={loading || !editingConfig.key.trim() || !editingConfig.default_value || 
                         !validateValue(editingConfig.default_value, editingConfig.value_type)}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : (createMode ? "Create Config" : "Update Config")}
              </button>
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setCreateMode(false);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-gray-900">Remote Configurations</h2>
              <p className="text-gray-600 text-sm mt-1">Manage dynamic configuration values for your application</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md"
            >
              + Create Config
            </button>
          </div>
        </div>

        {/* Config Testing Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Test Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Config key"
              value={testConfigKey}
              onChange={(e) => setTestConfigKey(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="User ID"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <input
              type="text"
              placeholder="User traits (country=US&plan=premium)"
              value={testUserTraits}
              onChange={(e) => setTestUserTraits(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={handleTestConfig}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium"
            >
              Test Config
            </button>
          </div>
          
          {testResult && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Test Result:</h4>
              <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {loading && configs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading configurations...</p>
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Remote Configurations Yet</h3>
              <p className="text-gray-600 mb-4">Create your first configuration to store dynamic values</p>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md"
              >
                Create Your First Config
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <div key={config.id} className="border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{config.key}</h3>
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {getValueTypeDisplay(config.value_type)}
                          </span>
                        </div>
                        
                        {config.description && (
                          <p className="text-gray-600 mb-3">{config.description}</p>
                        )}
                        
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-gray-600">Default Value:</span>
                            <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                              {config.value_type === "json" ? (
                                <pre className="whitespace-pre-wrap">{getValuePreview(config.default_value, config.value_type)}</pre>
                              ) : (
                                config.default_value
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm mt-3">
                          <div className="text-gray-500">
                            Updated {new Date(config.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedConfigId(config.id);
                            setShowSegmentModal(true);
                          }}
                          className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium rounded-md transition-colors text-sm"
                        >
                          Segments
                        </button>
                        <button
                          onClick={() => handleEdit(config)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(config.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Segments Modal */}
      {showSegmentModal && selectedConfigId && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Config Segments</h3>
              <button
                onClick={() => {
                  setShowSegmentModal(false);
                  setSelectedConfigId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {configSegments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No segments assigned to this config.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Use the API or add segment targeting to provide different values for different user groups.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {configSegments.map((cs) => (
                  <div key={cs.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{cs.segment.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">Priority: {cs.priority}</p>
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">Override Value:</span>
                          <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                            {cs.value}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        cs.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cs.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RemoteConfigs;