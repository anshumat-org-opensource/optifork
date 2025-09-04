import { useEffect, useState } from "react";

interface Rule {
  field: string;
  op: string;
  value: string;
}

interface FeatureFlag {
  id: number;
  name: string;
  description?: string;
  rollout: number;
  rules: Rule[];
}

function ListFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [error, setError] = useState("");
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  const fetchFlags = async () => {
    try {
      const res = await fetch("http://localhost:8000/flags");
      const data = await res.json();
      setFlags(data);
    } catch (err) {
      setError("❌ Failed to fetch flags");
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag({ ...flag });
  };

  const handleUpdate = async () => {
    if (!editingFlag) return;
    
    try {
      const response = await fetch(`http://localhost:8000/flags/${editingFlag.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingFlag.name,
          description: editingFlag.description,
          rollout: editingFlag.rollout,
          rules: editingFlag.rules
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update flag");
      }

      await fetchFlags();
      setEditingFlag(null);
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    }
  };

  const updateEditingFlag = (field: string, value: any) => {
    if (!editingFlag) return;
    setEditingFlag({ ...editingFlag, [field]: value });
  };

  const addRule = () => {
    if (!editingFlag) return;
    setEditingFlag({
      ...editingFlag,
      rules: [...editingFlag.rules, { field: "", op: "eq", value: "" }]
    });
  };

  const removeRule = (index: number) => {
    if (!editingFlag) return;
    setEditingFlag({
      ...editingFlag,
      rules: editingFlag.rules.filter((_, i) => i !== index)
    });
  };

  const updateRule = (index: number, field: keyof Rule, value: string) => {
    if (!editingFlag) return;
    const newRules = [...editingFlag.rules];
    newRules[index][field] = value;
    setEditingFlag({ ...editingFlag, rules: newRules });
  };

  if (editingFlag) {
    return (
      <div className="max-w-4xl p-6 bg-white shadow-lg rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Feature Flag</h2>
          <button
            onClick={() => setEditingFlag(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Flag Name</label>
            <input
              type="text"
              value={editingFlag.name}
              onChange={(e) => updateEditingFlag("name", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Flag name cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rollout Percentage</label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="0"
                max="100"
                value={editingFlag.rollout * 100}
                onChange={(e) => updateEditingFlag("rollout", parseFloat(e.target.value) / 100)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(editingFlag.rollout * 100)}
                  onChange={(e) => updateEditingFlag("rollout", parseFloat(e.target.value || "0") / 100)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={editingFlag.description || ""}
              onChange={(e) => updateEditingFlag("description", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Targeting Rules</label>
              <button
                onClick={addRule}
                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
              >
                + Add Rule
              </button>
            </div>
            
            <div className="space-y-3">
              {editingFlag.rules.map((rule, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Rule {index + 1}</span>
                    <button
                      onClick={() => removeRule(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Field"
                      value={rule.field}
                      onChange={(e) => updateRule(index, "field", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                    <select
                      value={rule.op}
                      onChange={(e) => updateRule(index, "op", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded"
                    >
                      <option value="eq">equals</option>
                      <option value="ne">not equals</option>
                      <option value="gt">greater than</option>
                      <option value="lt">less than</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateRule(index, "value", e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={handleUpdate}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Update Flag
          </button>
          <button
            onClick={() => setEditingFlag(null)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">🚩</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Feature Flags</h2>
              <p className="text-blue-100 text-sm">Manage and control your feature rollouts</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {flags.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚩</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Feature Flags Yet</h3>
              <p className="text-gray-600">Create your first feature flag to start controlling feature rollouts</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {flags.map((flag) => (
                <div key={flag.id} className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{flag.name}</h3>
                        {flag.description && (
                          <p className="text-gray-600 mb-2">{flag.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Rollout:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              flag.rollout >= 0.5 
                                ? 'bg-green-100 text-green-800'
                                : flag.rollout > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {Math.round(flag.rollout * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Rules:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              flag.rules.length > 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {flag.rules.length === 0 ? 'No rules' : `${flag.rules.length} rule${flag.rules.length !== 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(flag)}
                        className="ml-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
                      >
                        ⚙️ Edit
                      </button>
                    </div>

                    {/* Rollout Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Rollout Progress</span>
                        <span>{Math.round(flag.rollout * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${flag.rollout * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Targeting Rules */}
                    {flag.rules.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Targeting Rules</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {flag.rules.map((rule, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-3">
                              <div className="font-mono text-sm text-gray-800">
                                <span className="font-medium text-blue-600">{rule.field}</span>
                                <span className="text-gray-500 mx-2">{rule.op}</span>
                                <span className="font-medium text-green-600">{rule.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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

export default ListFlags;
