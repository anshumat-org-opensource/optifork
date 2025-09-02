// frontend/src/components/TestFlag.tsx
import React, { useState } from "react";

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
      const res = await fetch(`http://localhost:8001/flags/${flagName}?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(`Flag "${data.flag}" for user "${data.user_id}" is ${data.enabled ? "ENABLED ✅" : "DISABLED ❌"}`);
    } catch (err: any) {
      setResult("Error testing flag");
    }
  };

  return (
    <div className="border rounded p-4 shadow mt-6">
      <h2 className="text-lg font-semibold mb-2">3. Test Feature Flag</h2>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Flag name"
        value={flagName}
        onChange={(e) => setFlagName(e.target.value)}
      />
      <input
        className="border p-2 w-full mb-2"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <div className="flex gap-2 mb-2">
        <input
          className="border p-2 w-full"
          placeholder="Attribute key (e.g., country)"
          value={attrKey}
          onChange={(e) => setAttrKey(e.target.value)}
        />
        <input
          className="border p-2 w-full"
          placeholder="Attribute value (e.g., IN)"
          value={attrValue}
          onChange={(e) => setAttrValue(e.target.value)}
        />
      </div>
      <button
        className="bg-purple-600 text-white px-4 py-2 rounded"
        onClick={handleTest}
      >
        Test Flag
      </button>
      {result && <p className="mt-4">{result}</p>}
    </div>
  );
};

export default TestFlag;
