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
    <div className="max-w-6xl p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Feature Flags</h2>
      {error && <div className="text-red-600 mb-4 p-3 bg-red-50 rounded-lg">{error}</div>}

      {flags.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">🚩</div>
          <p className="text-gray-500">No feature flags found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => (
            <div key={flag.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{flag.name}</h3>
                  <p className="text-gray-600 text-sm">{flag.description || "No description"}</p>
                </div>
                <button
                  onClick={() => handleEdit(flag)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium"
                >
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Rollout:</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded">
                    {Math.round(flag.rollout * 100)}%
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Rules:</span>
                  <span className="ml-2">
                    {flag.rules.length === 0 ? (
                      <span className="text-gray-500">No targeting rules</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {flag.rules.length} rule{flag.rules.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              {flag.rules.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600 space-y-1">
                    {flag.rules.map((rule, idx) => (
                      <div key={idx} className="font-mono bg-gray-50 px-2 py-1 rounded">
                        {rule.field} {rule.op} {rule.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ListFlags;
