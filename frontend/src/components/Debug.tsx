import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
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
    ai_experiments: {
      view: boolean;
      manage: boolean;
      evaluate: boolean;
    };
  };
}

export default function Debug() {
  const [userData, setUserData] = useState<User | null>(null);
  const [usersData, setUsersData] = useState<any>(null);

  useEffect(() => {
    const user = localStorage.getItem('optifork_user');
    const users = localStorage.getItem('optifork_users');
    
    if (user) {
      setUserData(JSON.parse(user));
    }
    if (users) {
      setUsersData(JSON.parse(users));
    }
  }, []);

  const clearStorage = () => {
    localStorage.clear();
    setUserData(null);
    setUsersData(null);
    window.location.reload();
  };

  const canViewSection = (section: keyof User['permissions']) => {
    if (!userData) return false;
    return userData.permissions[section]?.view === true;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">Debug - AI Experiments Issue</h1>
          
          <button 
            onClick={clearStorage}
            className="bg-red-500 text-white px-4 py-2 rounded mb-4"
          >
            Clear Storage & Reload
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Current User</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {userData ? JSON.stringify(userData, null, 2) : 'No user data'}
              </pre>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">All Users</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {usersData ? JSON.stringify(usersData, null, 2) : 'No users data'}
              </pre>
            </div>
          </div>

          {userData && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Permission Checks</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>Feature Flags: {canViewSection('feature_flags') ? '✅' : '❌'}</p>
                  <p>Experiments: {canViewSection('experiments') ? '✅' : '❌'}</p>
                  <p>AI Experiments: {canViewSection('ai_experiments') ? '✅' : '❌'}</p>
                  <p>Integration: {canViewSection('integration') ? '✅' : '❌'}</p>
                  <p>Exposures: {canViewSection('exposures') ? '✅' : '❌'}</p>
                </div>
                <div>
                  <p>AI Experiments View: {userData.permissions.ai_experiments?.view ? '✅' : '❌'}</p>
                  <p>AI Experiments Manage: {userData.permissions.ai_experiments?.manage ? '✅' : '❌'}</p>
                  <p>AI Experiments Evaluate: {userData.permissions.ai_experiments?.evaluate ? '✅' : '❌'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}