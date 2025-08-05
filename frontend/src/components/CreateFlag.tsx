import { useState } from "react";

function CreateFlag() {
  const [name, setName] = useState("");
  const [rollout, setRollout] = useState("0.5");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    setMessage("");
    try {
      const body = {
        name,
        description,
        rollout: parseFloat(rollout),
        rules: [],
      };

      const res = await fetch("http://localhost:8000/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create flag");

      setMessage(`✅ ${data.message}`);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    }
  };

  return (
    <div className="max-w-md p-4 bg-white shadow rounded">
      <h2 className="text-xl font-semibold mb-4">Create Feature Flag</h2>

      <input
        type="text"
        placeholder="Flag Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full px-3 py-2 border rounded"
      />
      <input
        type="text"
        placeholder="Rollout % (0.0 - 1.0)"
        value={rollout}
        onChange={(e) => setRollout(e.target.value)}
        className="mb-2 w-full px-3 py-2 border rounded"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-4 w-full px-3 py-2 border rounded"
      />

      <button
        onClick={handleCreate}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Create Flag
      </button>

      {message && <div className="mt-4 text-sm">{message}</div>}
    </div>
  );
}

export default CreateFlag;
