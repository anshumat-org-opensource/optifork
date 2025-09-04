import { useState } from 'react';

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

interface LoginProps {
  onLogin: (user: User) => void;
}

// Get users from localStorage or create default admin
const getUsers = (): Record<string, User> => {
  const savedUsers = localStorage.getItem('optifork_users');
  if (savedUsers) {
    return JSON.parse(savedUsers);
  }
  
  // Default admin user
  const defaultUsers = {
    'admin': {
      id: '1',
      username: 'admin',
      email: 'admin@optifork.com',
      role: 'Administrator',
      permissions: {
        feature_flags: { view: true, manage: true, test: true },
        experiments: { view: true, manage: true, assign: true, results: true },
        exposures: { view: true },
        integration: { view: true }
      }
    }
  };
  
  localStorage.setItem('optifork_users', JSON.stringify(defaultUsers));
  return defaultUsers;
};

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const users = getUsers();
    
    // Check credentials - default admin password is 'admin123'
    const user = users[username];
    if (user) {
      const expectedPassword = username === 'admin' ? 'admin123' : user.password || username;
      if (password === expectedPassword) {
        localStorage.setItem('optifork_user', JSON.stringify(user));
        onLogin(user);
      } else {
        setError('Invalid username or password');
      }
    } else {
      setError('Invalid username or password');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-center">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">🚩</span>
            </div>
            <h1 className="text-2xl font-bold text-white">OptiFork</h1>
            <p className="text-blue-100 text-sm">Feature Flag & Experimentation Platform</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter password"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>🔐</span>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Default admin: admin / admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;