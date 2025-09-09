import { useState, useEffect } from 'react';

interface SnowflakeConfig {
  account: string;
  user: string;
  password: string;
  warehouse: string;
  database: string;
  schema: string;
}

interface ExportStatus {
  export_type: string;
  records_exported: number;
  status: string;
  error_message?: string;
  exported_at: string;
}

interface TableCounts {
  optifork_feature_flags: number;
  optifork_flag_exposures: number;
  optifork_experiments: number;
}

function SnowflakeIntegration() {
  const [config, setConfig] = useState<SnowflakeConfig>({
    account: '',
    user: '',
    password: '',
    warehouse: '',
    database: '',
    schema: ''
  });
  
  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [exportMessage, setExportMessage] = useState<string>('');
  const [recentExports, setRecentExports] = useState<ExportStatus[]>([]);
  const [tableCounts, setTableCounts] = useState<TableCounts>({
    optifork_feature_flags: 0,
    optifork_flag_exposures: 0,
    optifork_experiments: 0
  });
  
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['all']);
  const [sinceHours, setSinceHours] = useState<number>(24);

  useEffect(() => {
    loadExportStatus();
    loadSavedConfig();
  }, []);

  const loadSavedConfig = async () => {
    try {
      const response = await fetch('http://localhost:8000/integrations/snowflake/config');
      const data = await response.json();
      
      if (data.success && data.config.configured) {
        setConfig({
          account: data.config.account,
          user: data.config.user,
          password: '', // Don't populate password for security
          warehouse: data.config.warehouse,
          database: data.config.database,
          schema: data.config.schema
        });
        setIsConfigured(true);
        setShowConfigForm(false); // Hide the form when configuration is loaded
        setConnectionStatus('');
      } else {
        // No saved configuration found, show the form
        setIsConfigured(false);
        setShowConfigForm(true);
      }
    } catch (error) {
      console.error('Failed to load saved config:', error);
      setShowConfigForm(true); // Show form if there's an error
    }
  };

  const loadExportStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/integrations/snowflake/export-status');
      const data = await response.json();
      
      if (data.success) {
        setRecentExports(data.recent_exports || []);
        setTableCounts(data.table_counts || {});
      }
    } catch (error) {
      console.error('Failed to load export status:', error);
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectionStatus('');

    // If password is empty and we already have a config, prompt user to enter password
    if (!config.password && isConfigured) {
      setConnectionStatus('❌ Please enter your password to update the configuration.');
      setIsConnecting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/integrations/snowflake/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsConfigured(true);
        setShowConfigForm(false); // Hide form after successful configuration
        setConnectionStatus('✅ Configuration saved successfully! Connection tested.');
      } else {
        let errorMessage = `❌ ${data.error || 'Configuration failed'}`;
        
        if (data.troubleshooting) {
          errorMessage += '\n\n🔍 Troubleshooting:';
          data.troubleshooting.common_issues.forEach((issue: string, index: number) => {
            errorMessage += `\n${index + 1}. ${issue}`;
          });
        }
        
        if (data.suggestion) {
          errorMessage += `\n\n💡 Suggestion: ${data.suggestion}`;
        }
        
        setConnectionStatus(errorMessage);
      }
    } catch (error) {
      setConnectionStatus(`❌ Network error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const testConnection = async () => {
    setIsConnecting(true);
    setConnectionStatus('');

    try {
      const response = await fetch('http://localhost:8000/integrations/snowflake/test-connection');
      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus('✅ Connection successful! Tables verified/created.');
      } else {
        setConnectionStatus(`❌ ${data.error || 'Connection failed'}`);
      }
    } catch (error) {
      setConnectionStatus(`❌ Network error: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExport = async (fullExport: boolean = false) => {
    setIsExporting(true);
    setExportMessage('');

    try {
      const response = await fetch('http://localhost:8000/integrations/snowflake/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_types: selectedDataTypes,
          since_hours: fullExport ? null : sinceHours,
          full_export: fullExport
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (fullExport) {
          setExportMessage('✅ Full export started in background. Check export status for progress.');
        } else if (data.records_exported) {
          const total = data.records_exported.total || 0;
          setExportMessage(`✅ Successfully exported ${total} records to Snowflake`);
        } else {
          setExportMessage('✅ Export completed successfully');
        }
        
        // Refresh export status
        setTimeout(() => loadExportStatus(), 2000);
      } else {
        setExportMessage(`❌ ${data.error || 'Export failed'}`);
      }
    } catch (error) {
      setExportMessage(`❌ Network error: ${error}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDataTypeChange = (dataType: string) => {
    if (dataType === 'all') {
      setSelectedDataTypes(['all']);
    } else {
      const newTypes = selectedDataTypes.filter(t => t !== 'all');
      if (newTypes.includes(dataType)) {
        const updated = newTypes.filter(t => t !== dataType);
        setSelectedDataTypes(updated.length === 0 ? ['all'] : updated);
      } else {
        setSelectedDataTypes([...newTypes, dataType]);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-lg p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">❄️ Snowflake Integration</h2>
        <p className="text-blue-100 text-sm">Export feature flag, experiment, and exposure data to Snowflake</p>
      </div>

      {/* Configuration Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Snowflake Configuration</h3>
          {isConfigured && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
              ✅ Configured
            </span>
          )}
        </div>

        {/* Configuration Summary (when already configured) */}
        {isConfigured && !showConfigForm && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-800 font-medium">✅ Snowflake is connected and ready</p>
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    <p><span className="font-medium">Account:</span> {config.account}</p>
                    <p><span className="font-medium">User:</span> {config.user}</p>
                    <p><span className="font-medium">Warehouse:</span> {config.warehouse}</p>
                    <p><span className="font-medium">Database:</span> {config.database}</p>
                    <p><span className="font-medium">Schema:</span> {config.schema}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfigForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <span>⚙️</span>
                  <span>Edit Config</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={testConnection}
                disabled={isConnecting}
                className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Test Connection</span>
                  </>
                )}
              </button>
            </div>
            
            {connectionStatus && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium">{connectionStatus}</p>
              </div>
            )}
          </div>
        )}

        {/* Configuration Form (when not configured or editing) */}
        {(!isConfigured || showConfigForm) && (
          <>
            {showConfigForm && isConfigured && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ You are editing the Snowflake configuration. Changes will be saved automatically.
                </p>
              </div>
            )}
            
            <form onSubmit={handleConfigSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <input
                type="text"
                value={config.account}
                onChange={(e) => setConfig({ ...config, account: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your-account.snowflakecomputing.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <input
                type="text"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="username"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={isConfigured ? "Enter password to update config" : "password"}
                required={!isConfigured}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse
              </label>
              <input
                type="text"
                value={config.warehouse}
                onChange={(e) => setConfig({ ...config, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="COMPUTE_WH"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Database
              </label>
              <input
                type="text"
                value={config.database}
                onChange={(e) => setConfig({ ...config, database: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="OPTIFORK_DB"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schema
              </label>
              <input
                type="text"
                value={config.schema}
                onChange={(e) => setConfig({ ...config, schema: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="PUBLIC"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Configuring...</span>
                </>
              ) : (
                <>
                  <span>⚙️</span>
                  <span>{showConfigForm && isConfigured ? 'Update Config' : 'Configure & Test'}</span>
                </>
              )}
            </button>

            {showConfigForm && isConfigured && (
              <button
                type="button"
                onClick={() => {
                  setShowConfigForm(false);
                  setConnectionStatus('');
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>❌</span>
                <span>Cancel</span>
              </button>
            )}
          </div>

          {connectionStatus && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium">{connectionStatus}</p>
            </div>
          )}
            </form>
          </>
        )}
      </div>

      {/* Export Section */}
      {isConfigured && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>

          <div className="space-y-4">
            {/* Data Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Data to Export
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: '📊 All Data', description: 'Export everything' },
                  { key: 'feature_flags', label: '🚩 Feature Flags', description: 'Flag configurations' },
                  { key: 'experiments', label: '🧪 Experiments', description: 'A/B test configurations' },
                  { key: 'exposures', label: '👁️ Exposures', description: 'User exposure logs' }
                ].map(({ key, label, description }) => (
                  <label
                    key={key}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedDataTypes.includes(key)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDataTypes.includes(key)}
                      onChange={() => handleDataTypeChange(key)}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-gray-500">{description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Range */}
            {!selectedDataTypes.includes('all') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Data Since (Hours Ago)
                </label>
                <select
                  value={sinceHours}
                  onChange={(e) => setSinceHours(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>Last 1 hour</option>
                  <option value={6}>Last 6 hours</option>
                  <option value={24}>Last 24 hours</option>
                  <option value={72}>Last 3 days</option>
                  <option value={168}>Last 7 days</option>
                </select>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleExport(false)}
                disabled={isExporting}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Export Now</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleExport(true)}
                disabled={isExporting}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>📋</span>
                <span>Full Export</span>
              </button>

              <button
                onClick={loadExportStatus}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>🔄</span>
                <span>Refresh Status</span>
              </button>
            </div>

            {exportMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium">{exportMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Counts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Snowflake Table Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-medium">🚩 Feature Flags</span>
              <span className="text-blue-600 font-bold">{tableCounts.optifork_feature_flags}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-medium">👁️ Flag Exposures</span>
              <span className="text-green-600 font-bold">{tableCounts.optifork_flag_exposures}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="font-medium">🧪 Experiments</span>
              <span className="text-purple-600 font-bold">{tableCounts.optifork_experiments}</span>
            </div>
          </div>
        </div>

        {/* Recent Exports */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Export History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentExports.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm">No exports yet</p>
              </div>
            ) : (
              recentExports.map((exp, index) => (
                <div key={index} className={`p-3 border rounded-lg ${getStatusColor(exp.status)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium capitalize">{exp.export_type.replace('_', ' ')}</div>
                      <div className="text-sm">{exp.records_exported} records</div>
                      {exp.error_message && (
                        <div className="text-xs mt-1 text-red-600">{exp.error_message}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium capitalize`}>{exp.status}</div>
                      <div className="text-xs text-gray-500">
                        {formatDateTime(exp.exported_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SnowflakeIntegration;