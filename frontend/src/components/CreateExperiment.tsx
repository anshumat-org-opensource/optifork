import { useState } from "react";

interface Variant {
  name: string;
  traffic_split: number;
}

function CreateExperiment() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [flagId, setFlagId] = useState<number | undefined>(undefined);
  const [variants, setVariants] = useState<Variant[]>([
    { name: "", traffic_split: 0.5 },
    { name: "", traffic_split: 0.5 },
  ]);
  const [message, setMessage] = useState("");

  const handleVariantChange = (
    index: number,
    field: keyof Variant,
    value: string
  ) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [field]: field === "traffic_split" ? parseFloat(value) : value,
    };
    setVariants(updated);
  };

  const handleSubmit = async () => {
    const payload = {
      name,
      description,
      flag_id: flagId,
      variants,
    };

    try {
      const res = await fetch("http://localhost:8001/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create experiment");

      setMessage(`✅ Experiment '${data.name}' created`);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    }
  };

  return (
    <div className="max-w-xl p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Create Experiment</h2>

      <input
        type="text"
        placeholder="Experiment Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full px-3 py-2 border rounded"
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-2 w-full px-3 py-2 border rounded"
      />

      <input
        type="number"
        placeholder="Feature Flag ID (optional)"
        value={flagId ?? ""}
        onChange={(e) => setFlagId(e.target.value ? parseInt(e.target.value) : undefined)}
        className="mb-4 w-full px-3 py-2 border rounded"
      />

      <h3 className="text-lg font-medium mb-2">Variants</h3>
      {variants.map((variant, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Variant Name"
            value={variant.name}
            onChange={(e) => handleVariantChange(index, "name", e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            placeholder="Traffic Split"
            value={variant.traffic_split}
            onChange={(e) =>
              handleVariantChange(index, "traffic_split", e.target.value)
            }
            className="w-32 px-3 py-2 border rounded"
          />
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Create Experiment
      </button>

      {message && <div className="mt-4 text-sm">{message}</div>}
    </div>
  );
}

export default CreateExperiment;
