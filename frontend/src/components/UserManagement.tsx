import { useState, useEffect } from 'react';

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
    ai_experiments: {
      view: boolean;
      manage: boolean;
      evaluate: boolean;
    };
  };
}

const ROLE_PRESETS = {
  'Administrator': {
    feature_flags: { view: true, manage: true, test: true },
    experiments: { view: true, manage: true, assign: true, results: true },
    exposures: { view: true },
    integration: { view: true },
    ai_experiments: { view: true, manage: true, evaluate: true }
  },
  'Developer': {
    feature_flags: { view: true, manage: true, test: true },
    experiments: { view: true, manage: false, assign: true, results: true },
    exposures: { view: true },
    integration: { view: true },
    ai_experiments: { view: true, manage: true, evaluate: true }
  },
  'Data Analyst': {
    feature_flags: { view: true, manage: false, test: true },
    experiments: { view: true, manage: false, assign: false, results: true },
    exposures: { view: true },
    integration: { view: false },
    ai_experiments: { view: true, manage: false, evaluate: true }
  },
  'Viewer': {
    feature_flags: { view: true, manage: false, test: false },
    experiments: { view: true, manage: false, assign: false, results: false },
    exposures: { view: false },
    integration: { view: false },
    ai_experiments: { view: true, manage: false, evaluate: false }
  }
};

function UserManagement() {
  const [users, setUsers] = useState<Record<string, User>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Viewer',
    permissions: ROLE_PRESETS['Viewer']
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const savedUsers = localStorage.getItem('optifork_users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
  };

  const saveUsers = (updatedUsers: Record<string, User>) => {
    localStorage.setItem('optifork_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (users[formData.username]) {
      alert('Username already exists');
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      username: formData.username,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      permissions: formData.permissions
    };

    const updatedUsers = { ...users, [formData.username]: newUser };
    saveUsers(updatedUsers);
    
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'Viewer',
      permissions: ROLE_PRESETS['Viewer']
    });
    setShowCreateForm(false);
  };

  const handleDeleteUser = (username: string) => {
    if (username === 'admin') {
      alert('Cannot delete admin user');
      return;
    }
    
    if (confirm(`Are you sure you want to delete user "${username}"?`)) {
      const updatedUsers = { ...users };
      delete updatedUsers[username];
      saveUsers(updatedUsers);
    }
  };

  const handleRoleChange = (role: string) => {
    setFormData({
      ...formData,
      role,
      permissions: ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator': return 'bg-red-100 text-red-800 border-red-200';
      case 'Developer': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Data Analyst': return 'bg-green-100 text-green-800 border-green-200';
      case 'Viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Administrator': return 'A';
      case 'Developer': return 'D';
      case 'Data Analyst': return 'DA';
      case 'Viewer': return 'V';
      default: return 'U';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-6">
        <h2 className="text-2xl font-medium text-gray-900 mb-2">User Management</h2>
        <p className="text-gray-600 text-sm">Manage user accounts and permissions</p>
      </div>

      {/* Create User Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 font-medium transition-colors flex items-center space-x-2"
        >
          <span>Create User</span>
        </button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                >
                  {Object.keys(ROLE_PRESETS).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 font-medium transition-colors"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">User Accounts</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {Object.values(users).map(user => (
            <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{user.username}</h4>
                      <span className={`text-xs px-2 py-1 border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)} {user.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      {user.permissions.feature_flags.view && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700">Flags</span>
                      )}
                      {user.permissions.experiments.view && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700">Experiments</span>
                      )}
                      {user.permissions.exposures.view && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700">Exposures</span>
                      )}
                      {user.permissions.integration.view && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700">Integration</span>
                      )}
                      {user.permissions.ai_experiments.view && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700">AI Experiments</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {user.username !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(user.username)}
                      className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-50 transition-colors"
                      title="Delete User"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {Object.keys(users).length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;