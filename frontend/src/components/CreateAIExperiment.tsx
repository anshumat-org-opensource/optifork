import { useState } from "react";

interface AIExperiment {
  name: string;
  description: string;
}

export default function CreateAIExperiment() {
  const [experiment, setExperiment] = useState<AIExperiment>({
    name: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/ai-experiments/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(experiment),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(`AI Experiment "${result.name}" created successfully!`);
        setExperiment({ name: "", description: "" });
      } else {
        const error = await response.json();
        setMessage(`Error: ${error.detail || "Failed to create AI experiment"}`);
      }
    } catch (error) {
      setMessage("Error: Failed to connect to server");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create AI Experiment</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Experiment Name *
          </label>
          <input
            type="text"
            id="name"
            value={experiment.name}
            onChange={(e) => setExperiment({ ...experiment, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., chatbot-prompt-optimization"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={experiment.description}
            onChange={(e) => setExperiment({ ...experiment, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe what this AI experiment is testing..."
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isSubmitting || !experiment.name.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create AI Experiment"}
          </button>
        </div>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded-md ${
          message.startsWith("Error") 
            ? "bg-red-50 text-red-700 border border-red-200" 
            : "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {message}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Next Steps</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Configure prompt templates and model settings</li>
          <li>• Upload evaluation datasets</li>
          <li>• Run offline evaluations to compare performance</li>
          <li>• Analyze results and optimize your AI system</li>
        </ul>
      </div>
    </div>
  );
}