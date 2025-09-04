import { useState, useEffect } from "react";

interface Variant {
  name: string;
  traffic_split: number;
}

interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  rollout: number;
}

function CreateExperiment() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFlagName, setSelectedFlagName] = useState<string>("");
  const [selectedFlagId, setSelectedFlagId] = useState<number | undefined>(undefined);
  const [availableFlags, setAvailableFlags] = useState<FeatureFlag[]>([]);
  const [variants, setVariants] = useState<Variant[]>([
    { name: "control", traffic_split: 0.5 },
    { name: "variant_a", traffic_split: 0.5 },
  ]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available feature flags
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await fetch("http://localhost:8000/flags");
        if (res.ok) {
          const flags = await res.json();
          setAvailableFlags(flags);
        }
      } catch (err) {
        console.error("Failed to fetch flags:", err);
      }
    };
    fetchFlags();
  }, []);

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

  const handleFlagSelection = (flagName: string) => {
    setSelectedFlagName(flagName);
    const selectedFlag = availableFlags.find(flag => flag.name === flagName);
    setSelectedFlagId(selectedFlag?.id);
  };

  const addVariant = () => {
    setVariants([...variants, { name: "", traffic_split: 0 }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const getTotalTrafficSplit = () => {
    return variants.reduce((sum, variant) => sum + (variant.traffic_split || 0), 0);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setMessage("");

    // Validation
    if (!name.trim()) {
      setMessage("❌ Experiment name is required");
      setIsLoading(false);
      return;
    }

    if (variants.some(v => !v.name.trim())) {
      setMessage("❌ All variant names are required");
      setIsLoading(false);
      return;
    }

    const totalSplit = getTotalTrafficSplit();
    if (Math.abs(totalSplit - 1.0) > 0.001) {
      setMessage(`❌ Traffic splits must sum to 1.0 (current: ${totalSplit.toFixed(2)})`);
      setIsLoading(false);
      return;
    }

    const payload = {
      name,
      description,
      flag_id: selectedFlagId,
      variants,
    };

    try {
      const res = await fetch("http://localhost:8000/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create experiment");

      setMessage(`✅ Experiment '${data.name}' created successfully!`);
      
      // Reset form
      setName("");
      setDescription("");
      setSelectedFlagName("");
      setSelectedFlagId(undefined);
      setVariants([
        { name: "control", traffic_split: 0.5 },
        { name: "variant_a", traffic_split: 0.5 },
      ]);
    } catch (err: any) {
      setMessage("❌ " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">🧪</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Create New Experiment</h2>
            <p className="text-green-100 text-sm">Design and configure your A/B test</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Info */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experiment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., homepage_redesign_test"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                placeholder="Describe what this experiment tests..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Feature Flag
              </label>
              <select
                value={selectedFlagName}
                onChange={(e) => handleFlagSelection(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              >
                <option value="">Select a feature flag (optional)</option>
                {availableFlags.map((flag) => (
                  <option key={flag.id} value={flag.name}>
                    {flag.name} - {flag.description || 'No description'}
                  </option>
                ))}
              </select>
              {selectedFlagName && (
                <p className="text-sm text-green-600 mt-2">
                  🔗 Linked to feature flag: <strong>{selectedFlagName}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Variants */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Experiment Variants</h3>
                <p className="text-sm text-gray-600">Define the different versions to test</p>
              </div>
              <div className="text-sm text-gray-500">
                Total: {getTotalTrafficSplit().toFixed(2)} / 1.0
              </div>
            </div>

            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div key={index} className="flex gap-3 items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={`Variant ${index + 1} name`}
                      value={variant.name}
                      onChange={(e) => handleVariantChange(index, "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      placeholder="0.5"
                      value={variant.traffic_split || ""}
                      onChange={(e) =>
                        handleVariantChange(index, "traffic_split", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => removeVariant(index)}
                    disabled={variants.length <= 1}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                    title="Remove variant"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addVariant}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors"
            >
              + Add Variant
            </button>

            {getTotalTrafficSplit() !== 1.0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Traffic splits should sum to 1.0 for proper distribution
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {message && (
                <div className={`text-sm font-medium ${
                  message.includes('✅') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {message}
                </div>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !name.trim() || getTotalTrafficSplit() !== 1.0}
              className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>🧪</span>
                  <span>Create Experiment</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateExperiment;
