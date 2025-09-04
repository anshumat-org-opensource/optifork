import { useState, useEffect } from "react";

interface FlagExposure {
  id: number;
  flag_name: string;
  user_id: string;
  enabled: boolean;
  timestamp: string;
}

interface FlagExposuresProps {
  selectedFlag?: string;
}

function FlagExposures({ selectedFlag }: FlagExposuresProps) {
  const [exposures, setExposures] = useState<FlagExposure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFlagFilter, setSelectedFlagFilter] = useState(selectedFlag || "");
  const [availableFlags, setAvailableFlags] = useState<string[]>([]);

  const fetchExposures = async () => {
    setLoading(true);
    setError("");
    try {
      const url = selectedFlagFilter 
        ? `http://localhost:8000/flags/${selectedFlagFilter}/exposures?limit=100`
        : `http://localhost:8000/exposures?limit=100`;
      
      const response = await fetch(url);
      const data = await response.json();
      setExposures(data);
    } catch (err: any) {
      setError("Failed to fetch exposures: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlags = async () => {
    try {
      const response = await fetch("http://localhost:8000/flags");
      const flags = await response.json();
      setAvailableFlags(flags.map((f: any) => f.name));
    } catch (err) {
      console.error("Failed to fetch flags:", err);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  useEffect(() => {
    fetchExposures();
  }, [selectedFlagFilter]);

  useEffect(() => {
    if (selectedFlag) {
      setSelectedFlagFilter(selectedFlag);
    }
  }, [selectedFlag]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEnabledStats = () => {
    const enabled = exposures.filter(exp => exp.enabled).length;
    const disabled = exposures.length - enabled;
    const enabledPercentage = exposures.length > 0 ? ((enabled / exposures.length) * 100).toFixed(1) : "0";
    
    return { enabled, disabled, enabledPercentage };
  };

  const stats = getEnabledStats();

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">📊</span>
              Feature Flag Exposures
            </h2>
            <p className="text-gray-600 text-sm">
              Track when users are exposed to feature flags and their outcomes
            </p>
          </div>
          <button
            onClick={fetchExposures}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Flag
            </label>
            <select
              value={selectedFlagFilter}
              onChange={(e) => setSelectedFlagFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Flags</option>
              {availableFlags.map(flag => (
                <option key={flag} value={flag}>{flag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistics */}
        {exposures.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{exposures.length}</div>
              <div className="text-sm text-blue-800">Total Exposures</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
              <div className="text-sm text-green-800">Enabled</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.disabled}</div>
              <div className="text-sm text-red-800">Disabled</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.enabledPercentage}%</div>
              <div className="text-sm text-purple-800">Enabled Rate</div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Exposures List */}
      <div className="bg-white rounded-lg shadow-lg">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading exposures...</p>
          </div>
        ) : exposures.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <p className="text-gray-500">
              {selectedFlagFilter 
                ? `No exposures found for flag "${selectedFlagFilter}"` 
                : "No exposures found"}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Exposures are logged when users evaluate feature flags
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recent Exposures</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {exposures.map((exposure) => (
                <div key={exposure.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        exposure.enabled ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {exposure.flag_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          User: {exposure.user_id}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        exposure.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {exposure.enabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatTimestamp(exposure.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlagExposures;