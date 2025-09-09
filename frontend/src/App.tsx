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
import SnowflakeIntegration from "./components/SnowflakeIntegration";
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

type MainTab = "flags" | "experiments" | "integration" | "exports" | "users";
type FlagSubTab = "manage" | "test" | "exposures";
type ExperimentSubTab = "manage" | "assign" | "results";

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("flags");
  const [flagSubTab, setFlagSubTab] = useState<FlagSubTab>("manage");
  const [experimentSubTab, setExperimentSubTab] = useState<ExperimentSubTab>("manage");
  const [user, setUser] = useState<User | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      } else if (activeTab === "exports" && user.role !== 'Administrator') {
        if (canViewSection('feature_flags')) {
          setActiveTab('flags');
        } else if (canViewSection('experiments')) {
          setActiveTab('experiments');
        } else if (canViewSection('integration')) {
          setActiveTab('integration');
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Collapsible Sidebar */}
      <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-gray-900">OptiFork</h1>
              <p className="text-xs text-gray-500">{user.username}</p>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {canViewSection('feature_flags') && (
            <div>
              <button
                onClick={() => setActiveTab("flags")}
                className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "flags"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">🚩</span>
                {!isCollapsed && <span className="ml-3">Feature Flags</span>}
              </button>
              {activeTab === "flags" && !isCollapsed && (
                <div className="ml-6 mt-2 space-y-1">
                  {(user.permissions.feature_flags.view || user.permissions.feature_flags.manage) && (
                    <button
                      onClick={() => setFlagSubTab("manage")}
                      className={`block w-full text-left px-3 py-1 rounded text-xs ${
                        flagSubTab === "manage" ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Manage
                    </button>
                  )}
                  {user.permissions.feature_flags.test && (
                    <button
                      onClick={() => setFlagSubTab("test")}
                      className={`block w-full text-left px-3 py-1 rounded text-xs ${
                        flagSubTab === "test" ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Test
                    </button>
                  )}
                  {user.permissions.exposures.view && (
                    <button
                      onClick={() => setFlagSubTab("exposures")}
                      className={`block w-full text-left px-3 py-1 rounded text-xs ${
                        flagSubTab === "exposures" ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Exposures
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {canViewSection('experiments') && (
            <div>
              <button
                onClick={() => setActiveTab("experiments")}
                className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "experiments"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">🧪</span>
                {!isCollapsed && <span className="ml-3">Experiments</span>}
              </button>
              {activeTab === "experiments" && !isCollapsed && (
                <div className="ml-6 mt-2 space-y-1">
                  {(user.permissions.experiments.view || user.permissions.experiments.manage) && (
                    <button
                      onClick={() => setExperimentSubTab("manage")}
                      className={`block w-full text-left px-3 py-1 rounded text-xs ${
                        experimentSubTab === "manage" ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Manage
                    </button>
                  )}
                  {user.permissions.experiments.assign && (
                    <button
                      onClick={() => setExperimentSubTab("assign")}
                      className={`block w-full text-left px-3 py-1 rounded text-xs ${
                        experimentSubTab === "assign" ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Assign Users
                    </button>
                  )}
                  {user.permissions.experiments.results && (
                    <button
                      onClick={() => setExperimentSubTab("results")}
                      className={`block w-full text-left px-3 py-1 rounded text-xs ${
                        experimentSubTab === "results" ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Results
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {canViewSection('integration') && (
            <button
              onClick={() => setActiveTab("integration")}
              className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "integration"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <span className="text-base">🔌</span>
              {!isCollapsed && <span className="ml-3">Integration</span>}
            </button>
          )}

          {user.role === 'Administrator' && (
            <>
              <button
                onClick={() => setActiveTab("exports")}
                className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "exports"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">📊</span>
                {!isCollapsed && <span className="ml-3">Data Export</span>}
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">👥</span>
                {!isCollapsed && <span className="ml-3">Users</span>}
              </button>
            </>
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200">
          {!isCollapsed ? (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <span>🚪</span>
              <span className="ml-3">Logout</span>
            </button>
          ) : (
            <button 
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              title="Logout"
            >
              🚪
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 p-6 bg-white">
          {/* Feature Flags Section */}
          {activeTab === "flags" && (
            <div className="space-y-6">
              {flagSubTab === "manage" && (
                <div className="space-y-6">
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
              {experimentSubTab === "manage" && (
                <div className="space-y-6">
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

          {/* Data Export Section */}
          {activeTab === "exports" && user.role === 'Administrator' && (
            <SnowflakeIntegration />
          )}

          {/* Users Section */}
          {activeTab === "users" && user.role === 'Administrator' && (
            <UserManagement />
          )}
        </main>
      </div>
    </div>
  );
}
