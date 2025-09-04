// frontend/src/components/TestFlag.tsx
import { useState } from "react";

const TestFlag = () => {
  const [flagName, setFlagName] = useState("");
  const [userId, setUserId] = useState("");
  const [attrKey, setAttrKey] = useState("");
  const [attrValue, setAttrValue] = useState("");
  const [result, setResult] = useState("");

  const handleTest = async () => {
    const query = new URLSearchParams();
    query.append("user_id", userId);
    if (attrKey && attrValue) {
      query.append(attrKey, attrValue);
    }

    try {
      const res = await fetch(`http://localhost:8000/flags/${flagName}?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(`Flag "${data.flag}" for user "${data.user_id}" is ${data.enabled ? "ENABLED ✅" : "DISABLED ❌"}`);
    } catch (err: any) {
      setResult("Error testing flag");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
          <span className="text-green-600 font-bold">🧪</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Test Feature Flag</h2>
      </div>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flag Name <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter flag name to test"
            value={flagName}
            onChange={(e) => setFlagName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User Attributes (Optional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Attribute key (e.g., country)"
              value={attrKey}
              onChange={(e) => setAttrKey(e.target.value)}
            />
            <input
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Attribute value (e.g., IN)"
              value={attrValue}
              onChange={(e) => setAttrValue(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Add user attributes to test targeting rules
          </p>
        </div>

        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            onClick={handleTest}
            disabled={!flagName.trim() || !userId.trim()}
          >
            Test Flag
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${
            result.includes("ENABLED") 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : result.includes("DISABLED")
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}>
            <div className="font-medium">{result}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestFlag;
