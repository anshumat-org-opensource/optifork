import { useState, useEffect } from "react";
import CreateFlag from "./components/CreateFlag";
import ListFlags from "./components/ListFlags";
import TestFlag from "./components/TestFlag";
import CreateExperiment from "./components/CreateExperiment";
import ListExperiments from "./components/ListExperiments";
import AssignUserToVariant from "./components/AssignUserToVariant";
import ExperimentResults from "./components/ExperimentResults";
import FlagExposures from "./components/FlagExposures";
import IntegrationGuide from "./components/IntegrationGuide";
import UserManagement from "./components/UserManagement";
import Login from "./components/Login";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  password?: string;
  permissions: {
    feature_flags: {
      view: boolean;
      manage: boolean;
      test: boolean;
    };
    experiments: {
      view: boolean;
      manage: boolean;
      assign: boolean;
      results: boolean;
    };
    exposures: {
      view: boolean;
    };
    integration: {
      view: boolean;
    };
  };
}

type MainTab = "flags" | "experiments" | "integration" | "users";
type FlagSubTab = "manage" | "test" | "exposures";
type ExperimentSubTab = "manage" | "assign" | "results";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("flags");
  const [flagSubTab, setFlagSubTab] = useState<FlagSubTab>("manage");
  const [experimentSubTab, setExperimentSubTab] = useState<ExperimentSubTab>("manage");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('optifork_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === "flags" && !canViewSection('feature_flags')) {
        if (canViewSection('experiments')) {
          setActiveTab('experiments');
        } else if (canViewSection('integration')) {
          setActiveTab('integration');
        } else if (user.role === 'Administrator') {
          setActiveTab('users');
        }
      } else if (activeTab === "experiments" && !canViewSection('experiments')) {
        if (canViewSection('feature_flags')) {
          setActiveTab('flags');
        } else if (canViewSection('integration')) {
          setActiveTab('integration');
        } else if (user.role === 'Administrator') {
          setActiveTab('users');
        }
      } else if (activeTab === "integration" && !canViewSection('integration')) {
        if (canViewSection('feature_flags')) {
          setActiveTab('flags');
        } else if (canViewSection('experiments')) {
          setActiveTab('experiments');
        } else if (user.role === 'Administrator') {
          setActiveTab('users');
        }
      } else if (activeTab === "users" && user.role !== 'Administrator') {
        if (canViewSection('feature_flags')) {
          setActiveTab('flags');
        } else if (canViewSection('experiments')) {
          setActiveTab('experiments');
        } else if (canViewSection('integration')) {
          setActiveTab('integration');
        }
      }

      if (activeTab === "flags") {
        if (flagSubTab === "manage" && !user.permissions.feature_flags.view && !user.permissions.feature_flags.manage) {
          if (user.permissions.feature_flags.test) {
            setFlagSubTab('test');
          } else if (user.permissions.exposures.view) {
            setFlagSubTab('exposures');
          }
        } else if (flagSubTab === "test" && !user.permissions.feature_flags.test) {
          if (user.permissions.feature_flags.view || user.permissions.feature_flags.manage) {
            setFlagSubTab('manage');
          } else if (user.permissions.exposures.view) {
            setFlagSubTab('exposures');
          }
        } else if (flagSubTab === "exposures" && !user.permissions.exposures.view) {
          if (user.permissions.feature_flags.view || user.permissions.feature_flags.manage) {
            setFlagSubTab('manage');
          } else if (user.permissions.feature_flags.test) {
            setFlagSubTab('test');
          }
        }
      }

      if (activeTab === "experiments") {
        if (experimentSubTab === "manage" && !user.permissions.experiments.view && !user.permissions.experiments.manage) {
          if (user.permissions.experiments.assign) {
            setExperimentSubTab('assign');
          } else if (user.permissions.experiments.results) {
            setExperimentSubTab('results');
          }
        } else if (experimentSubTab === "assign" && !user.permissions.experiments.assign) {
          if (user.permissions.experiments.view || user.permissions.experiments.manage) {
            setExperimentSubTab('manage');
          } else if (user.permissions.experiments.results) {
            setExperimentSubTab('results');
          }
        } else if (experimentSubTab === "results" && !user.permissions.experiments.results) {
          if (user.permissions.experiments.view || user.permissions.experiments.manage) {
            setExperimentSubTab('manage');
          } else if (user.permissions.experiments.assign) {
            setExperimentSubTab('assign');
          }
        }
      }
    }
  }, [user, activeTab, flagSubTab, experimentSubTab]);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const canViewSection = (section: keyof User['permissions']) => {
    return user.permissions[section]?.view === true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl shadow-sm p-1 flex space-x-1">
            {canViewSection('feature_flags') && (
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
            )}
            {canViewSection('experiments') && (
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
            )}
            {canViewSection('integration') && (
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
            )}
            {user.role === 'Administrator' && (
              <button
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === "users"
                    ? "bg-pink-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab("users")}
              >
                👥 Users
              </button>
            )}
          </div>
        </div>

        {/* Feature Flags Section */}
        {activeTab === "flags" && (
          <div className="space-y-6">
            {/* Sub Navigation */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
                {(user.permissions.feature_flags.view || user.permissions.feature_flags.manage) && (
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
                )}
                {user.permissions.feature_flags.test && (
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
                )}
                {user.permissions.exposures.view && (
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
                )}
              </div>
            </div>

            {/* Flag Content */}
            {flagSubTab === "manage" && (
              <div className="space-y-8">
                <ProtectedRoute user={user} section="feature_flags" permission="manage">
                  <CreateFlag />
                </ProtectedRoute>
                <ProtectedRoute user={user} section="feature_flags" permission="view">
                  <ListFlags />
                </ProtectedRoute>
              </div>
            )}
            
            {flagSubTab === "test" && (
              <ProtectedRoute user={user} section="feature_flags" permission="test">
                <TestFlag />
              </ProtectedRoute>
            )}
            
            {flagSubTab === "exposures" && (
              <ProtectedRoute user={user} section="exposures" permission="view">
                <FlagExposures />
              </ProtectedRoute>
            )}
          </div>
        )}

        {/* Experiments Section */}
        {activeTab === "experiments" && (
          <div className="space-y-6">
            {/* Sub Navigation */}
            <div className="flex justify-center">
              <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
                {(user.permissions.experiments.view || user.permissions.experiments.manage) && (
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
                )}
                {user.permissions.experiments.assign && (
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
                )}
                {user.permissions.experiments.results && (
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
                )}
              </div>
            </div>

            {/* Experiment Content */}
            {experimentSubTab === "manage" && (
              <div className="space-y-8">
                <ProtectedRoute user={user} section="experiments" permission="manage">
                  <CreateExperiment />
                </ProtectedRoute>
                <ProtectedRoute user={user} section="experiments" permission="view">
                  <ListExperiments />
                </ProtectedRoute>
              </div>
            )}
            
            {experimentSubTab === "assign" && (
              <ProtectedRoute user={user} section="experiments" permission="assign">
                <AssignUserToVariant />
              </ProtectedRoute>
            )}
            
            {experimentSubTab === "results" && (
              <ProtectedRoute user={user} section="experiments" permission="results">
                <ExperimentResults />
              </ProtectedRoute>
            )}
          </div>
        )}

        {/* Integration Section */}
        {activeTab === "integration" && (
          <ProtectedRoute user={user} section="integration" permission="view">
            <IntegrationGuide />
          </ProtectedRoute>
        )}

        {/* Users Section */}
        {activeTab === "users" && user.role === 'Administrator' && (
          <UserManagement />
        )}
      </div>
    </div>
  );
}
