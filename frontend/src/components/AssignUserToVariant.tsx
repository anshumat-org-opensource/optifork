import { useState } from "react";

function AssignUserToVariant() {
  const [experimentName, setExperimentName] = useState("");
  const [userId, setUserId] = useState("");
  const [country, setCountry] = useState("");  // new field
  const [assignment, setAssignment] = useState("");
  const [error, setError] = useState("");

  const handleAssign = async () => {
    if (!experimentName || !userId || !country) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setAssignment("");

    try {
      const res = await fetch(
        `http://localhost:8000/experiments/${experimentName}/assign?user_id=${userId}&country=${country}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed to assign user");

      setAssignment(
        `✅ User "${data.user_id}" is assigned to variant "${data.variant}" in experiment "${data.experiment}".`
      );
    } catch (err: any) {
      setError("❌ " + err.message);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Assign User to Variant</h2>

      <input
        type="text"
        placeholder="Experiment Name"
        value={experimentName}
        onChange={(e) => setExperimentName(e.target.value)}
        className="mb-3 w-full px-4 py-2 border rounded"
      />

      <input
        type="text"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="mb-3 w-full px-4 py-2 border rounded"
      />

      <input
        type="text"
        placeholder="Country (e.g., IN)"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="mb-4 w-full px-4 py-2 border rounded"
      />

      <button
        onClick={handleAssign}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Assign User
      </button>

      {assignment && (
        <div className="mt-4 text-green-700 font-medium">{assignment}</div>
      )}

      {error && <div className="mt-4 text-red-600 font-medium">{error}</div>}
    </div>
  );
}

export default AssignUserToVariant;
