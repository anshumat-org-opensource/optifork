import { useEffect, useState } from "react";
import type { UserSegment } from "./UserSegments";

export interface FlagSegment {
  id: number;
  flag_id: number;
  segment_id: number;
  enabled: boolean;
  rollout_percentage: number;
  priority: number;
  segment: UserSegment;
}

export interface FlagSegmentAssociation {
  segment_id: number;
  enabled: boolean;
  rollout_percentage: number;
  priority: number;
}

interface FlagSegmentsProps {
  flagId: number;
  flagName?: string;
}

function FlagSegments({ flagId }: FlagSegmentsProps) {
  const [flagSegments, setFlagSegments] = useState<FlagSegment[]>([]);
  const [availableSegments, setAvailableSegments] = useState<UserSegment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAssociation, setNewAssociation] = useState<FlagSegmentAssociation>({
    segment_id: 0,
    enabled: true,
    rollout_percentage: 100,
    priority: 0
  });

  const fetchFlagSegments = async () => {
    try {
      const res = await fetch(`http://localhost:8000/flags/${flagId}/segments`);
      if (!res.ok) {
        throw new Error("Failed to fetch flag segments");
      }
      const data = await res.json();
      setFlagSegments(data);
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
    if (flagId) {
      fetchFlagSegments();
      fetchAvailableSegments();
    }
  }, [flagId]);

  const handleAddSegment = async () => {
    if (!newAssociation.segment_id) {
      setError("Please select a segment");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/flags/${flagId}/segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssociation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add segment to flag");
      }

      await fetchFlagSegments();
      setShowAddModal(false);
      setNewAssociation({
        segment_id: 0,
        enabled: true,
        rollout_percentage: 100,
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
    if (!window.confirm("Are you sure you want to remove this segment from the flag?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/flags/${flagId}/segments/${segmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to remove segment from flag");
      }

      await fetchFlagSegments();
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSegmentsForAdd = () => {
    const associatedSegmentIds = flagSegments.map(fs => fs.segment_id);
    return availableSegments.filter(segment => !associatedSegmentIds.includes(segment.id));
  };

  const getPriorityBadgeColor = (priority: number) => {
    if (priority >= 10) return "bg-red-100 text-red-800";
    if (priority >= 5) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Segment Targeting</h3>
          <p className="text-sm text-gray-600">Assign user segments to this flag with custom rollout settings</p>
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

      {flagSegments.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Segments Assigned</h4>
          <p className="text-gray-600 mb-4">
            This flag will use basic rule-based targeting. Add user segments for advanced targeting.
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
          {flagSegments
            .sort((a, b) => b.priority - a.priority)
            .map((flagSegment) => (
            <div key={flagSegment.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium text-gray-900">{flagSegment.segment.name}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeColor(flagSegment.priority)}`}>
                      Priority {flagSegment.priority}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      flagSegment.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {flagSegment.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  {flagSegment.segment.description && (
                    <p className="text-gray-600 text-sm mb-2">{flagSegment.segment.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Rollout:</span>
                      <span className="font-medium">{flagSegment.rollout_percentage}%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Conditions:</span>
                      <span className="font-medium">
                        {flagSegment.segment.conditions.length === 0 
                          ? 'All users' 
                          : `${flagSegment.segment.conditions.length} condition${flagSegment.segment.conditions.length !== 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSegment(flagSegment.segment_id)}
                  disabled={loading}
                  className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                >
                  Remove
                </button>
              </div>

              {/* Rollout Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Segment Rollout Progress</span>
                  <span>{flagSegment.rollout_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded">
                  <div 
                    className={`h-2 rounded transition-all duration-300 ${
                      flagSegment.enabled ? 'bg-green-600' : 'bg-gray-400'
                    }`}
                    style={{ width: `${flagSegment.rollout_percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Conditions Preview */}
              {flagSegment.segment.conditions.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-700 mb-2">Targeting Conditions:</div>
                  <div className="space-y-1">
                    {flagSegment.segment.conditions.slice(0, 2).map((condition, idx) => (
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
                    {flagSegment.segment.conditions.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{flagSegment.segment.conditions.length - 2} more condition{flagSegment.segment.conditions.length - 2 !== 1 ? 's' : ''}
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Segment to Flag</h3>
              
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rollout Percentage</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newAssociation.rollout_percentage}
                      onChange={(e) => setNewAssociation({...newAssociation, rollout_percentage: parseInt(e.target.value)})}
                      className="flex-1"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newAssociation.rollout_percentage}
                        onChange={(e) => setNewAssociation({...newAssociation, rollout_percentage: parseInt(e.target.value) || 0})}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>
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
                  disabled={loading || !newAssociation.segment_id}
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

export default FlagSegments;