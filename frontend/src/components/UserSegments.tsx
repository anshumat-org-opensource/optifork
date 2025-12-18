import { useEffect, useState } from "react";

export interface SegmentCondition {
  field: string;
  operator: string;
  value: any;
}

export interface UserSegment {
  id: number;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  created_at: string;
  updated_at: string;
}

function UserSegments() {
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingSegment, setEditingSegment] = useState<UserSegment | null>(null);
  const [createMode, setCreateMode] = useState(false);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/segments");
      if (!res.ok) {
        throw new Error("Failed to fetch segments");
      }
      const data = await res.json();
      setSegments(data);
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleEdit = (segment: UserSegment) => {
    setEditingSegment({ ...segment });
    setCreateMode(false);
  };

  const handleCreate = () => {
    setEditingSegment({
      id: 0,
      name: "",
      description: "",
      conditions: [],
      created_at: "",
      updated_at: ""
    });
    setCreateMode(true);
  };

  const handleSave = async () => {
    if (!editingSegment) return;
    
    try {
      setLoading(true);
      const url = createMode 
        ? "http://localhost:8000/segments"
        : `http://localhost:8000/segments/${editingSegment.id}`;
      
      const method = createMode ? "POST" : "PUT";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSegment.name,
          description: editingSegment.description,
          conditions: editingSegment.conditions
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${createMode ? 'create' : 'update'} segment`);
      }

      await fetchSegments();
      setEditingSegment(null);
      setCreateMode(false);
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (segmentId: number) => {
    if (!window.confirm("Are you sure you want to delete this segment?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/segments/${segmentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete segment");
      }

      await fetchSegments();
      setError("");
    } catch (err: any) {
      setError("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEditingSegment = (field: keyof UserSegment, value: any) => {
    if (!editingSegment) return;
    setEditingSegment({ ...editingSegment, [field]: value });
  };

  const addCondition = () => {
    if (!editingSegment) return;
    setEditingSegment({
      ...editingSegment,
      conditions: [...editingSegment.conditions, { field: "", operator: "equals", value: "" }]
    });
  };

  const removeCondition = (index: number) => {
    if (!editingSegment) return;
    setEditingSegment({
      ...editingSegment,
      conditions: editingSegment.conditions.filter((_, i) => i !== index)
    });
  };

  const updateCondition = (index: number, field: keyof SegmentCondition, value: any) => {
    if (!editingSegment) return;
    const newConditions = [...editingSegment.conditions];
    newConditions[index][field] = value;
    setEditingSegment({ ...editingSegment, conditions: newConditions });
  };

  const getOperatorDisplay = (operator: string) => {
    const operators = {
      equals: "equals",
      not_equals: "does not equal",
      contains: "contains",
      not_contains: "does not contain",
      in: "is one of",
      not_in: "is not one of",
      greater_than: "is greater than",
      less_than: "is less than",
      greater_than_or_equal: "is greater than or equal to",
      less_than_or_equal: "is less than or equal to",
      starts_with: "starts with",
      ends_with: "ends with"
    };
    return operators[operator as keyof typeof operators] || operator;
  };

  if (editingSegment) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-gray-900">
                  {createMode ? "Create User Segment" : "Edit User Segment"}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {createMode ? "Define targeting conditions for user groups" : "Update targeting conditions for this segment"}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingSegment(null);
                  setCreateMode(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Segment Name *</label>
                <input
                  type="text"
                  value={editingSegment.name}
                  onChange={(e) => updateEditingSegment("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="e.g., Premium Users, Beta Testers"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingSegment.description || ""}
                  onChange={(e) => updateEditingSegment("description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                  placeholder="Describe who this segment targets..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Targeting Conditions</label>
                  <button
                    onClick={addCondition}
                    className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md text-sm"
                  >
                    + Add Condition
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editingSegment.conditions.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-gray-500">No conditions defined. This segment will match all users.</p>
                      <button
                        onClick={addCondition}
                        className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black"
                      >
                        Add First Condition
                      </button>
                    </div>
                  ) : (
                    editingSegment.conditions.map((condition, index) => (
                      <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Condition {index + 1} {index > 0 && <span className="text-gray-500">AND</span>}
                          </span>
                          <button
                            onClick={() => removeCondition(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Field</label>
                            <input
                              type="text"
                              placeholder="e.g., country, plan_type, age"
                              value={condition.field}
                              onChange={(e) => updateCondition(index, "field", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Operator</label>
                            <select
                              value={condition.operator}
                              onChange={(e) => updateCondition(index, "operator", e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="equals">equals</option>
                              <option value="not_equals">does not equal</option>
                              <option value="contains">contains</option>
                              <option value="not_contains">does not contain</option>
                              <option value="in">is one of</option>
                              <option value="not_in">is not one of</option>
                              <option value="greater_than">is greater than</option>
                              <option value="less_than">is less than</option>
                              <option value="greater_than_or_equal">is greater than or equal to</option>
                              <option value="less_than_or_equal">is less than or equal to</option>
                              <option value="starts_with">starts with</option>
                              <option value="ends_with">ends with</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Value</label>
                            {condition.operator === "in" || condition.operator === "not_in" ? (
                              <input
                                type="text"
                                placeholder="value1,value2,value3"
                                value={Array.isArray(condition.value) ? condition.value.join(",") : condition.value}
                                onChange={(e) => {
                                  const values = e.target.value.split(",").map(v => v.trim()).filter(v => v);
                                  updateCondition(index, "value", values);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder="Value to compare against"
                                value={condition.value}
                                onChange={(e) => updateCondition(index, "value", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={handleSave}
                disabled={loading || !editingSegment.name.trim()}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : (createMode ? "Create Segment" : "Update Segment")}
              </button>
              <button
                onClick={() => {
                  setEditingSegment(null);
                  setCreateMode(false);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-gray-900">User Segments</h2>
              <p className="text-gray-600 text-sm mt-1">Define and manage user targeting segments</p>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md"
            >
              + Create Segment
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          {loading && segments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading segments...</p>
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No User Segments Yet</h3>
              <p className="text-gray-600 mb-4">Create your first user segment to enable advanced targeting</p>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-gray-900 text-white hover:bg-black font-medium rounded-md"
              >
                Create Your First Segment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div key={segment.id} className="border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{segment.name}</h3>
                        {segment.description && (
                          <p className="text-gray-600 mb-3">{segment.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Conditions:</span>
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {segment.conditions.length === 0 ? 'All users' : `${segment.conditions.length} condition${segment.conditions.length !== 1 ? 's' : ''}`}
                            </span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            Updated {new Date(segment.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(segment)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(segment.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Conditions Display */}
                    {segment.conditions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Targeting Conditions</h4>
                        <div className="space-y-2">
                          {segment.conditions.map((condition, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="font-mono text-sm text-gray-800">
                                {idx > 0 && <span className="text-gray-500 text-xs mr-2">AND</span>}
                                <span className="font-medium text-blue-700">{condition.field}</span>
                                <span className="text-gray-500 mx-2">{getOperatorDisplay(condition.operator)}</span>
                                <span className="font-medium text-green-700">
                                  {Array.isArray(condition.value) 
                                    ? `[${condition.value.join(', ')}]` 
                                    : JSON.stringify(condition.value)
                                  }
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserSegments;