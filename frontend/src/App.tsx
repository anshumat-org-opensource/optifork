import React, { useState } from 'react';

interface Rule {
  field: string;
  op: string;
  value: string;
}

interface Flag {
  name: string;
  description?: string;
  rollout: number;
  rules: Rule[];
}

export default function App() {
  const [createData, setCreateData] = useState<Flag>({
    name: '',
    description: '',
    rollout: 0.5,
    rules: [],
  });

  const [flags, setFlags] = useState<Flag[]>([]);
  const [testResult, setTestResult] = useState<string>('');
  const [testInput, setTestInput] = useState({
    flag_name: '',
    user_id: '',
    attrKey: '',
    attrValue: '',
  });

  const apiBase = 'http://localhost:8000';

  const handleCreateFlag = async () => {
    try {
      const response = await fetch(`${apiBase}/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      const result = await response.json();
      alert(result.message || 'Flag created');
    } catch (err) {
      alert('Error creating flag');
    }
  };

  const handleListFlags = async () => {
    const res = await fetch(`${apiBase}/flags`);
    const data = await res.json();
    setFlags(data);
  };

  const handleTestFlag = async () => {
    const query = new URLSearchParams();
    query.append('user_id', testInput.user_id);
    if (testInput.attrKey && testInput.attrValue) {
      query.append(testInput.attrKey, testInput.attrValue);
    }

    const url = `${apiBase}/flags/${testInput.flag_name}?${query.toString()}`;
    const res = await fetch(url);
    const data = await res.json();
    setTestResult(`Flag ${data.flag} enabled: ${data.enabled}`);
  };

  return (
    <div className="p-6 space-y-10 text-sm max-w-3xl mx-auto">
      {/* Section 1: Create Flag */}
      <div className="p-4 border rounded shadow">
        <h2 className="text-lg font-semibold">1. Create Feature Flag</h2>
        <input
          className="border p-1 w-full my-1"
          placeholder="Flag name"
          value={createData.name}
          onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
        />
        <input
          className="border p-1 w-full my-1"
          placeholder="Description"
          value={createData.description}
          onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
        />
        <input
          type="number"
          className="border p-1 w-full my-1"
          placeholder="Rollout (0 to 1)"
          value={createData.rollout}
          onChange={(e) =>
            setCreateData({ ...createData, rollout: parseFloat(e.target.value) })
          }
        />
        <button
          onClick={handleCreateFlag}
          className="bg-blue-600 text-white px-4 py-1 rounded mt-2"
        >
          Create Flag
        </button>
      </div>

      {/* Section 2: List Flags */}
      <div className="p-4 border rounded shadow">
        <h2 className="text-lg font-semibold">2. List All Flags</h2>
        <button
          onClick={handleListFlags}
          className="bg-green-600 text-white px-4 py-1 rounded my-2"
        >
          Load Flags
        </button>
        <ul className="list-disc list-inside">
          {flags.map((flag) => (
            <li key={flag.name}>
              <strong>{flag.name}</strong> — {flag.description} — Rollout: {flag.rollout}
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3: Test Flag */}
      <div className="p-4 border rounded shadow">
        <h2 className="text-lg font-semibold">3. Test Flag for User</h2>
        <input
          className="border p-1 w-full my-1"
          placeholder="Flag name"
          value={testInput.flag_name}
          onChange={(e) => setTestInput({ ...testInput, flag_name: e.target.value })}
        />
        <input
          className="border p-1 w-full my-1"
          placeholder="User ID"
          value={testInput.user_id}
          onChange={(e) => setTestInput({ ...testInput, user_id: e.target.value })}
        />
        <div className="flex gap-2">
          <input
            className="border p-1 w-full my-1"
            placeholder="Attribute key (e.g., country)"
            value={testInput.attrKey}
            onChange={(e) => setTestInput({ ...testInput, attrKey: e.target.value })}
          />
          <input
            className="border p-1 w-full my-1"
            placeholder="Attribute value (e.g., IN)"
            value={testInput.attrValue}
            onChange={(e) => setTestInput({ ...testInput, attrValue: e.target.value })}
          />
        </div>
        <button
          onClick={handleTestFlag}
          className="bg-purple-600 text-white px-4 py-1 rounded mt-2"
        >
          Test Flag
        </button>
        {testResult && <p className="mt-2">{testResult}</p>}
      </div>
    </div>
  );
}
