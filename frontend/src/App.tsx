import { useState } from "react";
import CreateFlag from "./components/CreateFlag";
import ListFlags from "./components/ListFlags";
import TestFlag from "./components/TestFlag";
import CreateExperiment from "./components/CreateExperiment";
import ListExperiments from "./components/ListExperiments";
import AssignUserToVariant from "./components/AssignUserToVariant";
import ExperimentResults from "./components/ExperimentResults";
import FlagExposures from "./components/FlagExposures";
import IntegrationGuide from "./components/IntegrationGuide";

type MainTab = "flags" | "experiments" | "integration";
type FlagSubTab = "manage" | "test" | "exposures";
type ExperimentSubTab = "manage" | "assign" | "results";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("flags");
  const [flagSubTab, setFlagSubTab] = useState<FlagSubTab>("manage");
  const [experimentSubTab, setExperimentSubTab] = useState<ExperimentSubTab>("manage");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🚩</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">OptiFork</h1>
                <p className="text-sm text-gray-600">Feature Flag & Experimentation Platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl shadow-sm p-1 flex space-x-1">
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === "flags"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("flags")}
            >
              🚩 Feature Flags
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === "experiments"
                  ? "bg-green-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("experiments")}
            >
              🧪 Experiments
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === "integration"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab("integration")}
            >
              🔌 Integration
            </button>
          </div>
        </div>

        {/* Feature Flags Section */}
        {activeTab === "flags" && (
          <div className="space-y-6">
            {/* Sub Navigation */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    flagSubTab === "manage"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setFlagSubTab("manage")}
                >
                  ⚙️ Manage
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    flagSubTab === "test"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setFlagSubTab("test")}
                >
                  🧪 Test
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    flagSubTab === "exposures"
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setFlagSubTab("exposures")}
                >
                  📊 Exposures
                </button>
              </div>
            </div>

            {/* Flag Content */}
            {flagSubTab === "manage" && (
              <div className="space-y-8">
                <CreateFlag />
                <ListFlags />
              </div>
            )}
            
            {flagSubTab === "test" && (
              <div>
                <TestFlag />
              </div>
            )}
            
            {flagSubTab === "exposures" && (
              <div>
                <FlagExposures />
              </div>
            )}
          </div>
        )}

        {/* Experiments Section */}
        {activeTab === "experiments" && (
          <div className="space-y-6">
            {/* Sub Navigation */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    experimentSubTab === "manage"
                      ? "bg-green-100 text-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setExperimentSubTab("manage")}
                >
                  ⚙️ Manage
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    experimentSubTab === "assign"
                      ? "bg-green-100 text-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setExperimentSubTab("assign")}
                >
                  👤 Assign Users
                </button>
                <button
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    experimentSubTab === "results"
                      ? "bg-green-100 text-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                  onClick={() => setExperimentSubTab("results")}
                >
                  📈 Results
                </button>
              </div>
            </div>

            {/* Experiment Content */}
            {experimentSubTab === "manage" && (
              <div className="space-y-8">
                <CreateExperiment />
                <ListExperiments />
              </div>
            )}
            
            {experimentSubTab === "assign" && (
              <div>
                <AssignUserToVariant />
              </div>
            )}
            
            {experimentSubTab === "results" && (
              <div>
                <ExperimentResults />
              </div>
            )}
          </div>
        )}

        {/* Integration Section */}
        {activeTab === "integration" && (
          <div>
            <IntegrationGuide />
          </div>
        )}
      </div>
    </div>
  );
}
