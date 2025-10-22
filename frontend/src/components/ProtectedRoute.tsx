import React from 'react';

interface User {
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

interface ProtectedRouteProps {
  user: User;
  section: 'feature_flags' | 'experiments' | 'exposures' | 'integration' | 'ai_experiments';
  permission: string; // 'view', 'manage', 'test', 'assign', 'results', 'evaluate'
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ProtectedRoute({ user, section, permission, children, fallback }: ProtectedRouteProps) {
  // Check if user has the required permission
  const hasPermission = () => {
    const sectionPermissions = user.permissions[section] as any;
    return sectionPermissions && sectionPermissions[permission] === true;
  };

  if (!hasPermission()) {
    return fallback || <AccessDenied section={section} permission={permission} />;
  }

  return <>{children}</>;
}

function AccessDenied({ section, permission }: { section: string; permission: string }) {
  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'feature_flags': return '🚩';
      case 'experiments': return '🧪';
      case 'exposures': return '📊';
      case 'integration': return '🔌';
      case 'ai_experiments': return '🤖';
      default: return '🔒';
    }
  };

  const getSectionName = (section: string) => {
    switch (section) {
      case 'feature_flags': return 'Feature Flags';
      case 'experiments': return 'Experiments';
      case 'exposures': return 'Exposures';
      case 'integration': return 'Integration';
      case 'ai_experiments': return 'AI Experiments';
      default: return section;
    }
  };

  const getPermissionName = (permission: string) => {
    switch (permission) {
      case 'view': return 'view';
      case 'manage': return 'manage';
      case 'test': return 'test';
      case 'assign': return 'assign users';
      case 'results': return 'view results';
      case 'evaluate': return 'evaluate';
      default: return permission;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 text-center">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Access Denied</h2>
          <p className="text-red-100 text-sm">Insufficient permissions</p>
        </div>

        <div className="p-8 text-center">
          <div className="text-6xl mb-4">{getSectionIcon(section)}</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {getSectionName(section)} - {getPermissionName(permission).charAt(0).toUpperCase() + getPermissionName(permission).slice(1)}
          </h3>
          <p className="text-gray-600 mb-6">
            You don't have permission to {getPermissionName(permission)} {getSectionName(section).toLowerCase()}.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-800 mb-2">💡 Need Access?</h4>
            <p className="text-sm text-gray-600">
              Contact your administrator to request the necessary permissions for this section.
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <span>Required permission:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              {section}.{permission}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProtectedRoute;