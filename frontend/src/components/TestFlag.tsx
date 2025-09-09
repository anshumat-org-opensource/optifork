// frontend/src/components/TestFlag.tsx
import { useState, useEffect } from "react";

interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  rollout: number;
  rules: Array<{
    field: string;
    op: string;
    value: string;
  }>;
}

const TestFlag = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [userId, setUserId] = useState("");
  const [userAttributes, setUserAttributes] = useState(`{
  "country": "US",
  "age": 25,
  "plan": "premium",
  "device": "mobile"
}`);
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch flags on component mount
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await fetch("http://localhost:8000/flags");
        if (res.ok) {
          const flagsData = await res.json();
          setFlags(flagsData);
        }
      } catch (err) {
        console.error("Failed to fetch flags:", err);
      }
    };

    fetchFlags();
  }, []);

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(userAttributes);
      setUserAttributes(JSON.stringify(parsed, null, 2));
    } catch (err) {
      // Invalid JSON, don't format
    }
  };

  const handleTest = async () => {
    if (!selectedFlag || !userId.trim()) {
      setResult("❌ Please select a flag and enter a user ID");
      return;
    }

    // Validate JSON
    let parsedAttributes;
    try {
      parsedAttributes = JSON.parse(userAttributes);
    } catch (err) {
      setResult("❌ Invalid JSON format in user attributes");
      return;
    }

    setResult("");
    setIsLoading(true);

    try {
      const query = new URLSearchParams();
      query.append("user_id", userId);
      
      // Add all attributes from JSON
      Object.entries(parsedAttributes).forEach(([key, value]) => {
        query.append(key, String(value));
      });

      const res = await fetch(`http://localhost:8000/flags/${selectedFlag.name}?${query.toString()}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.detail);
      
      setResult(`Flag "${data.flag}" for user "${data.user_id}" is ${data.enabled ? "ENABLED ✅" : "DISABLED ❌"}`);
    } catch (err: any) {
      setResult("❌ Error testing flag: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Test Feature Flag</h2>
            <p className="text-gray-600 text-sm mt-1">Evaluate flag behavior with custom user attributes</p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Flag Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Feature Flag <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFlag?.name || ""}
                  onChange={(e) => {
                    const flag = flags.find(f => f.name === e.target.value);
                    setSelectedFlag(flag || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                >
                  <option value="">Choose a feature flag...</option>
                  {flags.map((flag) => (
                    <option key={flag.id} value={flag.name}>
                      {flag.name} ({(flag.rollout * 100).toFixed(0)}% rollout)
                    </option>
                  ))}
                </select>
              </div>

              {selectedFlag && (
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2">Flag Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Description:</span>
                      <span className="ml-2">{selectedFlag.description || "No description"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Base Rollout:</span>
                      <span className="ml-2 font-mono text-gray-900">{(selectedFlag.rollout * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Targeting Rules:</span>
                      {selectedFlag.rules.length === 0 ? (
                        <span className="ml-2 text-gray-500">No rules defined</span>
                      ) : (
                        <div className="mt-1 space-y-1">
                          {selectedFlag.rules.map((rule, idx) => (
                            <div key={idx} className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 border border-gray-200">
                              <span className="text-gray-900 font-medium">{rule.field}</span>
                              <span className="text-gray-500 mx-1">{rule.op}</span>
                              <span className="text-gray-700 font-medium">{rule.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., user_12345"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                />
              </div>
            </div>

            {/* Right Column - User Attributes */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    User Attributes (JSON)
                  </label>
                  <button
                    onClick={formatJSON}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    Format JSON
                  </button>
                </div>
                <textarea
                  value={userAttributes}
                  onChange={(e) => setUserAttributes(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-1 focus:ring-gray-500 focus:border-gray-500 font-mono text-sm resize-none transition-colors"
                  placeholder='{
  "country": "US",
  "age": 25,
  "plan": "premium"
}'
                />
                <p className="text-xs text-gray-500 mt-2">
                  Add user attributes to test against targeting rules. These will be evaluated to determine flag state.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">How Flag Evaluation Works</h4>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Check targeting rules first (if any match, use them)</li>
                  <li>If no rules match, use base rollout percentage</li>
                  <li>User ID is hashed for consistent assignment</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {result && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="p-4 bg-gray-50 text-gray-800 border border-gray-200">
                <div className="font-medium">{result}</div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={handleTest}
                disabled={isLoading || !selectedFlag || !userId.trim()}
                className="px-8 py-2 bg-gray-900 text-white font-medium hover:bg-black disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Testing...</span>
                  </>
                ) : (
                  <span>Test Feature Flag</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestFlag;
