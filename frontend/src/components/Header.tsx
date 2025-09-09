import { useState } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: any;
}

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

function Header({ user, onLogout }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'bg-red-100 text-red-800';
      case 'Developer':
        return 'bg-blue-100 text-blue-800';
      case 'Data Analyst':
        return 'bg-green-100 text-green-800';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'A';
      case 'Developer':
        return 'D';
      case 'Data Analyst':
        return 'DA';
      case 'Viewer':
        return 'V';
      default:
        return 'U';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('optifork_user');
    onLogout();
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 flex items-center justify-center">
              <span className="text-white font-medium text-lg">OF</span>
            </div>
            <div>
              <h1 className="text-xl font-medium text-gray-900">OptiFork</h1>
              <p className="text-xs text-gray-600">Feature Flag & Experimentation Platform</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user.username}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(user.role)}`}>
                  {getRoleIcon(user.role)} {user.role}
                </div>
              </div>
              <div className="w-8 h-8 bg-gray-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className={`text-xs px-2 py-1 mt-1 inline-block ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)} {user.role}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div className="p-4 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Your Permissions</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">Feature Flags:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.permissions.feature_flags.view && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">View</span>
                        )}
                        {user.permissions.feature_flags.manage && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Manage</span>
                        )}
                        {user.permissions.feature_flags.test && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">Test</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Experiments:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.permissions.experiments.view && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">View</span>
                        )}
                        {user.permissions.experiments.manage && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Manage</span>
                        )}
                        {user.permissions.experiments.assign && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Assign</span>
                        )}
                        {user.permissions.experiments.results && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Results</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Other:</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {user.permissions.exposures.view && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Exposures</span>
                        )}
                        {user.permissions.integration.view && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">Integration</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;