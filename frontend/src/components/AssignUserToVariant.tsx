import { useState, useEffect } from "react";

interface Experiment {
  id: number;
  name: string;
  description: string;
  status: string;
  flag_id?: number;
  variants: Array<{
    id: number;
    name: string;
    traffic_split: number;
  }>;
}

interface FeatureFlag {
  id: number;
  name: string;
  description: string;
  rollout: number;
}

function AssignUserToVariant() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [userId, setUserId] = useState("");
  const [userAttributes, setUserAttributes] = useState(`{
  "country": "US",
  "age": 25,
  "plan": "premium",
  "device": "mobile"
}`);
  const [assignment, setAssignment] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch experiments and flags on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [experimentsRes, flagsRes] = await Promise.all([
          fetch("http://localhost:8000/experiments"),
          fetch("http://localhost:8000/flags")
        ]);

        if (experimentsRes.ok) {
          const experimentsData = await experimentsRes.json();
          setExperiments(experimentsData);
        }

        if (flagsRes.ok) {
          const flagsData = await flagsRes.json();
          setFlags(flagsData);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
  }, []);

  const getLinkedFlag = (flagId?: number) => {
    return flags.find(flag => flag.id === flagId);
  };

  const handleAssign = async () => {
    if (!selectedExperiment || !userId.trim()) {
      setError("Please select an experiment and enter a user ID.");
      return;
    }

    // Validate JSON
    let parsedAttributes;
    try {
      parsedAttributes = JSON.parse(userAttributes);
    } catch (err) {
      setError("Invalid JSON format in user attributes");
      return;
    }

    setError("");
    setAssignment("");
    setIsLoading(true);

    try {
      // Convert attributes to URL params
      const params = new URLSearchParams();
      params.append("user_id", userId);
      
      Object.entries(parsedAttributes).forEach(([key, value]) => {
        params.append(key, String(value));
      });

      const res = await fetch(
        `http://localhost:8000/experiments/${selectedExperiment.name}/assign?${params.toString()}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed to assign user");

      setAssignment(
        `User "${data.user_id}" assigned to variant "${data.variant}" in experiment "${data.experiment}"`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(userAttributes);
      setUserAttributes(JSON.stringify(parsed, null, 2));
    } catch (err) {
      // Invalid JSON, don't format
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-2xl font-medium text-gray-900">User Assignment</h2>
              <p className="text-gray-600 text-sm">Assign users to experiment variants with custom attributes</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Experiment Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Experiment <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedExperiment?.name || ""}
                  onChange={(e) => {
                    const experiment = experiments.find(exp => exp.name === e.target.value);
                    setSelectedExperiment(experiment || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                >
                  <option value="">Choose an experiment...</option>
                  {experiments.map((exp) => (
                    <option key={exp.id} value={exp.name}>
                      {exp.name} ({exp.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedExperiment && (
                <div className="p-4 bg-gray-50 border">
                  <h3 className="font-medium text-gray-800 mb-2">Experiment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Description:</span>
                      <span className="ml-2">{selectedExperiment.description || "No description"}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium ${
                        selectedExperiment.status === 'active'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedExperiment.status}
                      </span>
                    </div>
                    {selectedExperiment.flag_id && getLinkedFlag(selectedExperiment.flag_id) && (
                      <div>
                        <span className="font-medium text-gray-600">Linked Flag:</span>
                        <span className="ml-2 text-gray-600 font-medium">
                          {getLinkedFlag(selectedExperiment.flag_id)?.name}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-600">Variants:</span>
                      <div className="mt-1 space-y-1">
                        {selectedExperiment.variants.map((variant) => (
                          <div key={variant.id} className="flex justify-between">
                            <span>{variant.name}</span>
                            <span className="font-mono text-gray-600">{(variant.traffic_split * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
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
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm resize-none transition-colors"
                  placeholder='{
  "country": "US",
  "age": 25,
  "plan": "premium"
}'
                />
                <p className="text-xs text-gray-500 mt-2">
                  Add any user attributes that might affect variant assignment. These will be used for targeting rules.
                </p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200">
                <h4 className="font-medium text-gray-800 mb-2">Tip</h4>
                <p className="text-sm text-gray-700">
                  User attributes are passed as query parameters to the assignment API. 
                  Make sure the values match any targeting rules defined in the linked feature flag.
                </p>
              </div>
            </div>
          </div>

          {/* Assignment Results */}
          {(assignment || error) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              {assignment && (
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-gray-800 font-medium">{assignment}</p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-gray-50 border border-gray-200">
                  <p className="text-gray-800 font-medium">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={handleAssign}
                disabled={isLoading || !selectedExperiment || !userId.trim()}
                className="px-8 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <span>Assign User to Variant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssignUserToVariant;
