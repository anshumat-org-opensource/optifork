import { useState } from "react";
import CreateFlag from "./components/CreateFlag";
import ListFlags from "./components/ListFlags";
import TestFlag from "./components/TestFlag";
import CreateExperiment from "./components/CreateExperiment";
import ListExperiments from "./components/ListExperiments";
import AssignUserToVariant from "./components/AssignUserToVariant";
import ExperimentResults from "./components/ExperimentResults";

type Tab = "flags" | "experiments" | "results";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("flags");

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6 text-blue-700">OptiFork</h1>

        <div className="flex justify-center gap-6 mb-8">
          <button
            className={`px-4 py-2 rounded ${
              activeTab === "flags"
                ? "bg-blue-600 text-white"
                : "bg-white text-blue-600 border border-blue-600"
            }`}
            onClick={() => setActiveTab("flags")}
          >
            📍 Feature Flags
          </button>
          <button
            className={`px-4 py-2 rounded ${
              activeTab === "experiments"
                ? "bg-green-600 text-white"
                : "bg-white text-green-600 border border-green-600"
            }`}
            onClick={() => setActiveTab("experiments")}
          >
            🧪 Experiments
          </button>
          <button
            className={`px-4 py-2 rounded ${
              activeTab === "results"
                ? "bg-purple-600 text-white"
                : "bg-white text-purple-600 border border-purple-600"
            }`}
            onClick={() => setActiveTab("results")}
          >
            📊 Results
          </button>
        </div>

        {/* Render section based on activeTab */}
        {activeTab === "flags" && (
          <div className="space-y-10">
            <CreateFlag />
            <ListFlags />
            <TestFlag />
          </div>
        )}

        {activeTab === "experiments" && (
          <div className="space-y-10">
            <CreateExperiment />
            <ListExperiments />
            <AssignUserToVariant />
          </div>
        )}

        {activeTab === "results" && (
          <div>
            <ExperimentResults />
          </div>
        )}
      </div>
    </div>
  );
}
