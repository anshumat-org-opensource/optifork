import { useState } from "react";

interface Rule {
  field: string;
  op: string;
  value: string;
}

function CreateFlag() {
  const [name, setName] = useState("");
  const [rollout, setRollout] = useState("0.5");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);

  const handleCreate = async () => {
    setMessage("");
    try {
      const body = {
        name,
        description,
        rollout: parseFloat(rollout),
        rules: rules,
      };

      const res = await fetch("http://localhost:8000/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create flag");

      setMessage(`✅ ${data.message}`);
      setName("");
      setRollout("0.5");
      setDescription("");
      setRules([]);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    }
  };

  const addRule = () => {
    setRules([...rules, { field: "", op: "eq", value: "" }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof Rule, value: string) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  return (
    <div className="max-w-2xl p-6 bg-white shadow-lg rounded-lg">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <span className="text-blue-600 font-bold">🚩</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Create Feature Flag</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flag Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., new_checkout_flow"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rollout Percentage
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={parseFloat(rollout) * 100}
              onChange={(e) => setRollout((parseFloat(e.target.value) / 100).toString())}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${parseFloat(rollout) * 100}%, #e5e7eb ${parseFloat(rollout) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={Math.round(parseFloat(rollout) * 100)}
                onChange={(e) => setRollout((parseFloat(e.target.value || "0") / 100).toString())}
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(parseFloat(rollout) * 100)}% of users will see this feature when no rules match
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            placeholder="What does this feature flag control?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Targeting Rules
              </label>
              <p className="text-xs text-gray-500">Override rollout for specific user attributes</p>
            </div>
            <button
              type="button"
              onClick={addRule}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-sm">+</span>
              <span className="text-sm font-medium">Add Rule</span>
            </button>
          </div>
          
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Rule {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Field</label>
                    <input
                      type="text"
                      placeholder="e.g., country, age"
                      value={rule.field}
                      onChange={(e) => updateRule(index, "field", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Operator</label>
                    <select
                      value={rule.op}
                      onChange={(e) => updateRule(index, "op", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="eq">equals</option>
                      <option value="ne">not equals</option>
                      <option value="gt">greater than</option>
                      <option value="lt">less than</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                    <input
                      type="text"
                      placeholder="e.g., US, 18"
                      value={rule.value}
                      onChange={(e) => updateRule(index, "value", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {rules.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <div className="mb-2">🎯</div>
                <p className="text-sm">No targeting rules defined</p>
                <p className="text-xs">Add rules to override rollout for specific users</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-3 pt-6 border-t border-gray-200">
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Create Feature Flag
        </button>
        <button
          type="button"
          onClick={() => {
            setName("");
            setRollout("0.5");
            setDescription("");
            setRules([]);
            setMessage("");
          }}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.startsWith('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default CreateFlag;
