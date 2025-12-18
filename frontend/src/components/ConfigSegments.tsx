import { useEffect, useState } from "react";
import type { UserSegment } from "./UserSegments";
import type { RemoteConfig } from "./RemoteConfigs";

export interface ConfigSegment {
  id: number;
  config_id: number;
  segment_id: number;
  value: string;
  enabled: boolean;
  priority: number;
  segment: UserSegment;
}

export interface ConfigSegmentAssociation {
  segment_id: number;
  value: string;
  enabled: boolean;
  priority: number;
}

interface ConfigSegmentsProps {
  config: RemoteConfig;
}

function ConfigSegments({ config }: ConfigSegmentsProps) {
  const [configSegments, setConfigSegments] = useState<ConfigSegment[]>([]);
  const [availableSegments, setAvailableSegments] = useState<UserSegment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssociation, setNewAssociation] = useState<ConfigSegmentAssociation>({
    segment_id: 0,
    value: "",
    enabled: true,
    priority: 0
  });

  const fetchConfigSegments = async () => {
    try {
      const res = await fetch(`http://localhost:8000/configs/${config.id}/segments`);
      if (!res.ok) {
        throw new Error("Failed to fetch config segments");
      }
      const data = await res.json();
      setConfigSegments(data);
    } catch (err: any) {
      setError("❌ " + err.message);
    }
  };

  const fetchAvailableSegments = async () => {
    try {
      const res = await fetch("http://localhost:8000/segments");
      if (!res.ok) {
        throw new Error("Failed to fetch segments");
      }
      const data = await res.json();
      setAvailableSegments(data);
    } catch (err: any) {
      setError("❌ " + err.message);
    }
  };

  useEffect(() => {
    fetchConfigSegments();
    fetchAvailableSegments();
  }, [config.id]);

  const handleAddSegment = async () => {
    if (!newAssociation.segment_id || !newAssociation.value.trim()) {
      setError("Please select a segment and provide a value");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/configs/${config.id}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssociation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add segment to config");
      }

      await fetchConfigSegments();
      setShowAddModal(false);
      setNewAssociation({
        segment_id: 0,
        value: "",
        enabled: true,
        priority: 0
      });
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSegment = async (segmentId: number) => {
    if (!window.confirm("Are you sure you want to remove this segment from the config?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/configs/${config.id}/segments/${segmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to remove segment from config");
      }

      await fetchConfigSegments();
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSegmentsForAdd = () => {
    const associatedSegmentIds = configSegments.map(cs => cs.segment_id);
    return availableSegments.filter(segment => !associatedSegmentIds.includes(segment.id));
  };

  const getPriorityBadgeColor = (priority: number) => {
    if (priority >= 10) return "bg-red-100 text-red-800";
    if (priority >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const validateValue = (value: string, valueType: string): boolean => {
    switch (valueType) {
      case "number":
        return !isNaN(Number(value));
      case "boolean":
        return ["true", "false", "1", "0", "yes", "no", "on", "off"].includes(value.toLowerCase());
      case "json":
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  };

  const getValuePreview = (value: string, valueType: string) => {
    if (valueType === "json") {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return value;
      }
    }
    return value;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Segment Targeting</h3>
          <p className="text-sm text-gray-600">Assign different values to user segments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={getAvailableSegmentsForAdd().length === 0}
          className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add Segment
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {configSegments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Segments Assigned</h4>
          <p className="text-gray-600 mb-4">
            All users will receive the default value. Add segments to provide different values for different user groups.
          </p>
          {getAvailableSegmentsForAdd().length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md"
            >
              Add First Segment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {configSegments
            .sort((a, b) => b.priority - a.priority)
            .map((configSegment) => (
            <div key={configSegment.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{configSegment.segment.name}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(configSegment.priority)}`}>
                      Priority {configSegment.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      configSegment.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {configSegment.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  {configSegment.segment.description && (
                    <p className="text-gray-600 text-sm mb-2">{configSegment.segment.description}</p>
                  )}
                  
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">Override Value:</span>
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      {config.value_type === "json" ? (
                        <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap overflow-x-auto">
                          {getValuePreview(configSegment.value, config.value_type)}
                        </pre>
                      ) : (
                        <code className="text-sm text-gray-800">{configSegment.value}</code>
                      )}
                    </div>
                    
                    {!validateValue(configSegment.value, config.value_type) && (
                      <p className="text-red-600 text-sm mt-1">
                        ⚠️ Invalid value for {config.value_type} type
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Conditions:</span>
                      <span className="font-medium">
                        {configSegment.segment.conditions.length === 0 
                          ? 'All users' 
                          : `${configSegment.segment.conditions.length} condition${configSegment.segment.conditions.length !== 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => handleRemoveSegment(configSegment.segment_id)}
                  disabled={loading}
                  className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                >
                  Remove
                </button>
              </div>

              {/* Conditions Preview */}
              {configSegment.segment.conditions.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-700 mb-2">Targeting Conditions:</div>
                  <div className="space-y-1">
                    {configSegment.segment.conditions.slice(0, 2).map((condition: any, idx: number) => (
                      <div key={idx} className="font-mono text-xs text-gray-600">
                        {idx > 0 && <span className="text-gray-400 mr-1">AND</span>}
                        <span className="text-blue-600">{condition.field}</span>
                        <span className="mx-1">{condition.operator}</span>
                        <span className="text-green-600">
                          {Array.isArray(condition.value) 
                            ? `[${condition.value.join(', ')}]` 
                            : JSON.stringify(condition.value)
                          }
                        </span>
                      </div>
                    ))}
                    {configSegment.segment.conditions.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{configSegment.segment.conditions.length - 2} more condition{configSegment.segment.conditions.length - 2 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Segment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Segment to Config</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Segment</label>
                  <select
                    value={newAssociation.segment_id}
                    onChange={(e) => setNewAssociation({...newAssociation, segment_id: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"
                  >
                    <option value={0}>Choose a segment...</option>
                    {getAvailableSegmentsForAdd().map((segment) => (
                      <option key={segment.id} value={segment.id}>
                        {segment.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value ({config.value_type})
                  </label>
                  {config.value_type === "boolean" ? (
                    <select
                      value={newAssociation.value}
                      onChange={(e) => setNewAssociation({...newAssociation, value: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"
                    >
                      <option value="">Select value...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : config.value_type === "json" ? (
                    <textarea
                      value={newAssociation.value}
                      onChange={(e) => setNewAssociation({...newAssociation, value: e.target.value})}
                      rows={4}
                      placeholder='{"key": "value"}'
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 font-mono text-sm"
                    />
                  ) : (
                    <input
                      type={config.value_type === "number" ? "number" : "text"}
                      value={newAssociation.value}
                      onChange={(e) => setNewAssociation({...newAssociation, value: e.target.value})}
                      placeholder={
                        config.value_type === "number" ? "123" :
                        config.value_type === "string" ? "Text value" :
                        "Value"
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"
                    />
                  )}
                  
                  {newAssociation.value && !validateValue(newAssociation.value, config.value_type) && (
                    <p className="text-red-600 text-sm mt-1">Invalid value for {config.value_type} type</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <input
                    type="number"
                    value={newAssociation.priority}
                    onChange={(e) => setNewAssociation({...newAssociation, priority: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500"
                    placeholder="Higher numbers = higher priority"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher priority segments are evaluated first</p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="segment-enabled"
                    checked={newAssociation.enabled}
                    onChange={(e) => setNewAssociation({...newAssociation, enabled: e.target.checked})}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <label htmlFor="segment-enabled" className="ml-2 block text-sm text-gray-700">
                    Enable this segment
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleAddSegment}
                  disabled={loading || !newAssociation.segment_id || !newAssociation.value.trim() || 
                           !validateValue(newAssociation.value, config.value_type)}
                  className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Adding..." : "Add Segment"}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConfigSegments;