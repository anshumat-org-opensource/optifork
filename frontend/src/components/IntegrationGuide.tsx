import { useState } from "react";

type Language = "javascript" | "python" | "java" | "go" | "curl";

interface CodeExample {
  language: Language;
  name: string;
  examples: {
    title: string;
    description: string;
    code: string;
  }[];
}

const codeExamples: CodeExample[] = [
  {
    language: "javascript",
    name: "JavaScript/Node.js",
    examples: [
      {
        title: "Basic Flag Check",
        description: "Check if a feature flag is enabled for a user",
        code: `// Using fetch API
async function checkFeatureFlag(flagName, userId, userAttributes = {}) {
  const params = new URLSearchParams({
    user_id: userId,
    ...userAttributes
  });
  
  try {
    const response = await fetch(\`\${API_BASE_URL}/flags/\${flagName}?\${params}\`);
    const result = await response.json();
    return result.enabled;
  } catch (error) {
    console.error('Feature flag check failed:', error);
    return false; // Fail closed
  }
}

// Usage
const isNewCheckoutEnabled = await checkFeatureFlag(
  'new_checkout_flow', 
  'user123',
  { country: 'US', plan: 'premium' }
);

if (isNewCheckoutEnabled) {
  // Show new checkout flow
} else {
  // Show old checkout flow
}`
      },
      {
        title: "Experiment Assignment", 
        description: "Get user variant assignment for A/B testing",
        code: `// Get experiment assignment
async function getExperimentVariant(experimentName, userId, userAttributes = {}) {
  const params = new URLSearchParams({
    user_id: userId,
    ...userAttributes
  });
  
  try {
    const response = await fetch(\`\${API_BASE_URL}/experiments/\${experimentName}/assign?\${params}\`);
    const result = await response.json();
    return result.variant;
  } catch (error) {
    console.error('Experiment assignment failed:', error);
    return 'control'; // Default to control variant
  }
}

// Usage with feature flags
async function getFeatureExperience(userId, userAttributes) {
  // Check if experiment is enabled via feature flag
  const experimentEnabled = await checkFeatureFlag(
    'homepage_experiment_enabled', 
    userId, 
    userAttributes
  );
  
  if (experimentEnabled) {
    // Get experiment variant
    const variant = await getExperimentVariant(
      'homepage_redesign',
      userId,
      userAttributes
    );
    
    return variant; // 'control', 'variant_a', 'variant_b'
  }
  
  return 'control'; // No experiment, use control
}

// Usage
const variant = await getFeatureExperience('user123', { 
  country: 'US', 
  plan: 'premium' 
});

// Render different UI based on variant
switch (variant) {
  case 'variant_a':
    renderNewHomepage();
    break;
  case 'variant_b': 
    renderAlternativeHomepage();
    break;
  default:
    renderOriginalHomepage();
}`
      },
      {
        title: "React Hook",
        description: "Custom hook for feature flags in React applications",
        code: `import { useState, useEffect } from 'react';

function useFeatureFlag(flagName, userId, userAttributes = {}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkFlag() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          user_id: userId,
          ...userAttributes
        });
        
        const response = await fetch(\`\${API_BASE_URL}/flags/\${flagName}?\${params}\`);
        const result = await response.json();
        setEnabled(result.enabled);
        setError(null);
      } catch (err) {
        setError(err);
        setEnabled(false); // Fail closed
      } finally {
        setLoading(false);
      }
    }

    if (flagName && userId) {
      checkFlag();
    }
  }, [flagName, userId, JSON.stringify(userAttributes)]);

  return { enabled, loading, error };
}

// Usage in component
function CheckoutButton({ userId }) {
  const { enabled: newCheckout, loading } = useFeatureFlag(
    'new_checkout_flow', 
    userId,
    { country: 'US' }
  );

  if (loading) return <div>Loading...</div>;

  return (
    <button className={newCheckout ? 'new-style' : 'old-style'}>
      {newCheckout ? 'New Checkout' : 'Classic Checkout'}
    </button>
  );
}`
      },
      {
        title: "Remote Config Manager",
        description: "Manage remote configurations with caching",
        code: `class ConfigManager {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
    this.configs = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  async fetchConfigs() {
    const response = await fetch(\`\${this.baseUrl}/configs\`);
    const configs = await response.json();
    
    configs.forEach(config => {
      this.configs.set(config.name, {
        ...config,
        cached_at: Date.now()
      });
    });
    return configs;
  }

  async getConfig(name, defaultValue = null) {
    const cached = this.configs.get(name);
    
    // Check cache validity
    if (cached && (Date.now() - cached.cached_at) < this.cacheTTL) {
      return cached.config_data;
    }
    
    await this.fetchConfigs();
    const config = this.configs.get(name);
    return config ? config.config_data : defaultValue;
  }

  async isFeatureEnabled(featureName) {
    const featureFlags = await this.getConfig('feature_flags', {});
    return featureFlags[featureName] || false;
  }
}

// React Hook for Remote Configs
function useRemoteConfig(configName, defaultValue = null) {
  const [config, setConfig] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('http://localhost:8000/configs');
        const configs = await response.json();
        
        const targetConfig = configs.find(c => c.name === configName);
        setConfig(targetConfig ? targetConfig.config_data : defaultValue);
      } catch (error) {
        console.error('Config fetch failed:', error);
        setConfig(defaultValue);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [configName, defaultValue]);

  return { config, loading };
}

// Usage
const configManager = new ConfigManager();

// Component using remote config
function Dashboard() {
  const { config: themeConfig } = useRemoteConfig('app_theme');
  const { config: features } = useRemoteConfig('feature_flags');

  return (
    <div style={{ color: themeConfig?.primary_color }}>
      {features?.enable_new_dashboard ? (
        <NewDashboard />
      ) : (
        <LegacyDashboard />
      )}
    </div>
  );
}`
      },
      {
        title: "User Segments Manager",
        description: "Segment-based configuration targeting",
        code: `class UserSegmentManager {
  constructor(configManager) {
    this.configManager = configManager;
    this.userContext = {};
    this.segments = [];
  }

  setUserContext(context) {
    this.userContext = { ...context };
    this.evaluateSegments();
  }

  async fetchSegments() {
    const response = await fetch(\`\${this.configManager.baseUrl}/segments\`);
    this.segments = await response.json();
    this.evaluateSegments();
  }

  evaluateSegments() {
    return this.segments.filter(segment => {
      return this.matchesCriteria(this.userContext, segment.criteria);
    });
  }

  matchesCriteria(userContext, criteria) {
    return Object.entries(criteria).every(([key, value]) => {
      const userValue = userContext[key];
      
      if (Array.isArray(value)) {
        return value.includes(userValue);
      }
      
      if (typeof value === 'number') {
        return userValue >= value;
      }
      
      return userValue === value;
    });
  }

  async getSegmentedConfig(configName, defaultValue = null) {
    const userSegments = this.evaluateSegments();
    
    // Try segment-specific configs first
    for (const segment of userSegments) {
      const segmentConfigName = \`\${configName}_\${segment.name}\`;
      const segmentConfig = await this.configManager.getConfig(segmentConfigName);
      if (segmentConfig) {
        return segmentConfig;
      }
    }
    
    // Fallback to general config
    return await this.configManager.getConfig(configName, defaultValue);
  }
}

// Usage
const configManager = new ConfigManager();
const segmentManager = new UserSegmentManager(configManager);

// Set user context
segmentManager.setUserContext({
  country: 'US',
  subscription_tier: 'premium',
  account_age_days: 45
});

// Get segmented configuration
async function getUserExperience() {
  const features = await segmentManager.getSegmentedConfig('feature_flags');
  const theme = await segmentManager.getSegmentedConfig('app_theme');
  
  return { features, theme };
}`
      }
    ]
  },
  {
    language: "python",
    name: "Python",
    examples: [
      {
        title: "Basic Flag Check",
        description: "Simple feature flag client for Python applications",
        code: `import requests
from typing import Dict, Optional

class OptiForkClient:
    def __init__(self, api_base_url: str):
        self.api_base_url = api_base_url.rstrip('/')
    
    def check_flag(self, flag_name: str, user_id: str, 
                   user_attributes: Optional[Dict] = None) -> bool:
        """Check if a feature flag is enabled for a user."""
        try:
            params = {'user_id': user_id}
            if user_attributes:
                params.update(user_attributes)
            
            response = requests.get(
                f"{self.api_base_url}/flags/{flag_name}",
                params=params,
                timeout=5
            )
            response.raise_for_status()
            
            return response.json().get('enabled', False)
        except Exception as e:
            print(f"Feature flag check failed: {e}")
            return False  # Fail closed

# Usage
client = OptiForkClient('http://localhost:8000')

# Check flag
is_enabled = client.check_flag(
    'new_algorithm',
    'user123',
    {'country': 'US', 'plan': 'premium'}
)

if is_enabled:
    # Use new algorithm
    result = new_recommendation_algorithm(user_data)
else:
    # Use old algorithm
    result = legacy_recommendation_algorithm(user_data)`
      },
      {
        title: "Experiment Assignment",
        description: "A/B testing with experiments in Python",
        code: `import requests
from typing import Dict, Optional

class OptiForkClient:
    def __init__(self, api_base_url: str):
        self.api_base_url = api_base_url.rstrip('/')
    
    def get_experiment_variant(self, experiment_name: str, user_id: str,
                              user_attributes: Optional[Dict] = None) -> str:
        """Get user's variant assignment for an experiment."""
        try:
            params = {'user_id': user_id}
            if user_attributes:
                params.update(user_attributes)
            
            response = requests.get(
                f"{self.api_base_url}/experiments/{experiment_name}/assign",
                params=params,
                timeout=5
            )
            response.raise_for_status()
            
            return response.json().get('variant', 'control')
        except Exception as e:
            print(f"Experiment assignment failed: {e}")
            return 'control'  # Default to control

    def get_feature_experience(self, user_id: str, experiment_name: str, 
                              flag_name: str, user_attributes: Optional[Dict] = None) -> str:
        """Get feature experience combining flags and experiments."""
        # First check if experiment is enabled via feature flag
        experiment_enabled = self.check_flag(flag_name, user_id, user_attributes)
        
        if experiment_enabled:
            # Get experiment variant
            return self.get_experiment_variant(experiment_name, user_id, user_attributes)
        
        return 'control'  # No experiment, use control

# Usage example
client = OptiForkClient('http://localhost:8000')

# Get experiment variant
variant = client.get_feature_experience(
    user_id='user123',
    experiment_name='checkout_optimization', 
    flag_name='checkout_experiment_enabled',
    user_attributes={'country': 'US', 'plan': 'premium'}
)

# Use variant to determine behavior
if variant == 'one_page_checkout':
    checkout_page = render_one_page_checkout(user_data)
elif variant == 'simplified_checkout':
    checkout_page = render_simplified_checkout(user_data) 
else:  # control
    checkout_page = render_original_checkout(user_data)`
      },
      {
        title: "Django Decorator",
        description: "Django decorator for feature flag-gated views",
        code: `from functools import wraps
from django.http import HttpResponseRedirect
import requests

def feature_flag_required(flag_name):
    """Decorator to check feature flag before executing view."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user_id = str(request.user.id) if request.user.is_authenticated else None
            
            if not user_id:
                return HttpResponseRedirect('/login/')
            
            # Get user attributes
            user_attributes = {
                'country': getattr(request.user, 'country', ''),
                'plan': getattr(request.user, 'plan', 'free')
            }
            
            # Check flag
            try:
                params = {'user_id': user_id, **user_attributes}
                response = requests.get(
                    f"http://localhost:8000/flags/{flag_name}",
                    params=params,
                    timeout=5
                )
                enabled = response.json().get('enabled', False)
            except:
                enabled = False  # Fail closed
            
            if enabled:
                return view_func(request, *args, **kwargs)
            else:
                return HttpResponseRedirect('/feature-not-available/')
        
        return wrapper
    return decorator

# Usage
@feature_flag_required('new_dashboard')
def new_dashboard_view(request):
    return render(request, 'new_dashboard.html')`
      },
      {
        title: "Remote Config Client",
        description: "Python client for remote configurations",
        code: `import requests
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

class OptiForkClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient()
        self.config_cache = {}
        self.cache_ttl = timedelta(minutes=5)
    
    async def get_config(self, config_name: str, default_value: Any = None) -> Optional[Dict[str, Any]]:
        """Get remote configuration with caching."""
        # Check cache
        if config_name in self.config_cache:
            cached_data, timestamp = self.config_cache[config_name]
            if datetime.now() - timestamp < self.cache_ttl:
                return cached_data
        
        try:
            response = await self.client.get(f"{self.base_url}/configs")
            response.raise_for_status()
            configs = response.json()
            
            for config in configs:
                if config["name"] == config_name:
                    config_data = config["config_data"]
                    # Cache the result
                    self.config_cache[config_name] = (config_data, datetime.now())
                    return config_data
            
            return default_value
        except Exception as e:
            print(f"Failed to fetch config {config_name}: {e}")
            return default_value
    
    async def get_all_configs(self) -> Dict[str, Any]:
        """Get all configurations."""
        try:
            response = await self.client.get(f"{self.base_url}/configs")
            response.raise_for_status()
            configs = response.json()
            
            result = {}
            for config in configs:
                result[config["name"]] = config["config_data"]
                # Cache individual configs
                self.config_cache[config["name"]] = (config["config_data"], datetime.now())
            
            return result
        except Exception as e:
            print(f"Failed to fetch configs: {e}")
            return {}
    
    async def create_config(self, name: str, config_data: Dict[str, Any], 
                          description: str = "", environment: str = "production"):
        """Create a new remote configuration."""
        payload = {
            "name": name,
            "description": description,
            "config_data": config_data,
            "environment": environment,
            "is_active": True
        }
        
        response = await self.client.post(f"{self.base_url}/configs", json=payload)
        response.raise_for_status()
        return response.json()

# Usage Examples
async def main():
    client = OptiForkClient('http://localhost:8000')
    
    # Get theme configuration
    theme_config = await client.get_config('app_theme', {
        'primary_color': '#007bff',
        'dark_mode': False
    })
    
    # Get feature flags
    feature_flags = await client.get_config('feature_flags', {})
    
    # Check if feature is enabled
    new_dashboard_enabled = feature_flags.get('enable_new_dashboard', False)
    
    if new_dashboard_enabled:
        print("Using new dashboard")
    else:
        print("Using legacy dashboard")`
      },
      {
        title: "User Segments Client",
        description: "Python implementation for user segmentation",
        code: `import requests
import httpx
from typing import Dict, Any, List, Optional

class UserSegmentManager:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.client = httpx.AsyncClient()
        self.segments_cache = None
        self.cache_timestamp = None
        self.cache_ttl_minutes = 10
    
    async def fetch_segments(self, force_refresh: bool = False) -> List[Dict]:
        """Fetch user segments with caching."""
        if not force_refresh and self.segments_cache is not None:
            # Check if cache is still valid
            if self.cache_timestamp and \
               (datetime.now() - self.cache_timestamp).total_seconds() < self.cache_ttl_minutes * 60:
                return self.segments_cache
        
        try:
            response = await self.client.get(f"{self.base_url}/segments")
            response.raise_for_status()
            self.segments_cache = response.json()
            self.cache_timestamp = datetime.now()
            return self.segments_cache
        except Exception as e:
            print(f"Failed to fetch segments: {e}")
            return []
    
    def matches_criteria(self, user_context: Dict[str, Any], criteria: Dict[str, Any]) -> bool:
        """Check if user context matches segment criteria."""
        for key, expected_value in criteria.items():
            user_value = user_context.get(key)
            
            if isinstance(expected_value, list):
                if user_value not in expected_value:
                    return False
            elif isinstance(expected_value, (int, float)):
                if not isinstance(user_value, (int, float)) or user_value < expected_value:
                    return False
            else:
                if user_value != expected_value:
                    return False
        
        return True
    
    async def get_user_segments(self, user_context: Dict[str, Any]) -> List[str]:
        """Get segment names that match the user context."""
        segments = await self.fetch_segments()
        matching_segments = []
        
        for segment in segments:
            if segment.get('is_active', True) and \
               self.matches_criteria(user_context, segment.get('criteria', {})):
                matching_segments.append(segment['name'])
        
        return matching_segments
    
    async def create_segment(self, name: str, criteria: Dict[str, Any], 
                           description: str = "", is_active: bool = True):
        """Create a new user segment."""
        payload = {
            "name": name,
            "description": description,
            "criteria": criteria,
            "is_active": is_active
        }
        
        response = await self.client.post(f"{self.base_url}/segments", json=payload)
        response.raise_for_status()
        
        # Invalidate cache
        self.segments_cache = None
        return response.json()

# Combined usage with configs
class SegmentedConfigManager:
    def __init__(self, config_client: OptiForkClient, segment_manager: UserSegmentManager):
        self.config_client = config_client
        self.segment_manager = segment_manager
    
    async def get_segmented_config(self, config_name: str, user_context: Dict[str, Any], 
                                  default_value: Any = None) -> Any:
        """Get configuration based on user segments."""
        # Get user segments
        user_segments = await self.segment_manager.get_user_segments(user_context)
        
        # Try segment-specific configs first (most specific wins)
        for segment in user_segments:
            segment_config_name = f"{config_name}_{segment}"
            segment_config = await self.config_client.get_config(segment_config_name)
            if segment_config is not None:
                return segment_config
        
        # Fallback to general config
        return await self.config_client.get_config(config_name, default_value)

# Usage Example
async def get_user_experience():
    config_client = OptiForkClient('http://localhost:8000')
    segment_manager = UserSegmentManager('http://localhost:8000')
    segmented_config = SegmentedConfigManager(config_client, segment_manager)
    
    # User context
    user_context = {
        'country': 'US',
        'subscription_tier': 'premium',
        'account_age_days': 45,
        'device': 'mobile'
    }
    
    # Get segmented theme configuration
    theme_config = await segmented_config.get_segmented_config(
        'app_theme', 
        user_context, 
        {'primary_color': '#007bff'}
    )
    
    # Get segmented feature flags
    feature_flags = await segmented_config.get_segmented_config(
        'feature_flags',
        user_context,
        {}
    )
    
    return {
        'theme': theme_config,
        'features': feature_flags,
        'user_segments': await segment_manager.get_user_segments(user_context)
    }`
      }
    ]
  },
  {
    language: "java",
    name: "Java/Spring",
    examples: [
      {
        title: "Spring Service",
        description: "Feature flag service for Spring Boot applications",
        code: `@Service
public class FeatureFlagService {
    
    @Value("\${optifork.api.base-url}")
    private String apiBaseUrl;
    
    private final RestTemplate restTemplate;
    
    public FeatureFlagService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    public boolean checkFlag(String flagName, String userId, Map<String, String> userAttributes) {
        try {
            UriComponentsBuilder builder = UriComponentsBuilder
                .fromHttpUrl(apiBaseUrl + "/flags/" + flagName)
                .queryParam("user_id", userId);
                
            if (userAttributes != null) {
                userAttributes.forEach(builder::queryParam);
            }
            
            ResponseEntity<Map> response = restTemplate.getForEntity(
                builder.toUriString(), 
                Map.class
            );
            
            Map<String, Object> body = response.getBody();
            return body != null && Boolean.TRUE.equals(body.get("enabled"));
            
        } catch (Exception e) {
            log.error("Feature flag check failed for flag: " + flagName, e);
            return false; // Fail closed
        }
    }
}

// Usage in controller
@RestController
public class UserController {
    
    @Autowired
    private FeatureFlagService featureFlagService;
    
    @GetMapping("/profile")
    public ResponseEntity<UserProfile> getUserProfile(@RequestParam String userId) {
        Map<String, String> userAttributes = Map.of(
            "country", "US",
            "plan", "premium"
        );
        
        boolean newProfileEnabled = featureFlagService.checkFlag(
            "new_profile_layout", 
            userId, 
            userAttributes
        );
        
        if (newProfileEnabled) {
            return ResponseEntity.ok(newProfileService.getProfile(userId));
        } else {
            return ResponseEntity.ok(legacyProfileService.getProfile(userId));
        }
    }
}`
      }
    ]
  },
  {
    language: "go",
    name: "Go",
    examples: [
      {
        title: "Go Client",
        description: "Feature flag client for Go applications",
        code: `package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "time"
)

type OptiForkClient struct {
    BaseURL    string
    HTTPClient *http.Client
}

type FlagResponse struct {
    Flag    string \`json:"flag"\`
    UserID  string \`json:"user_id"\`
    Enabled bool   \`json:"enabled"\`
}

func NewOptiForkClient(baseURL string) *OptiForkClient {
    return &OptiForkClient{
        BaseURL: baseURL,
        HTTPClient: &http.Client{
            Timeout: 5 * time.Second,
        },
    }
}

func (c *OptiForkClient) CheckFlag(flagName, userID string, userAttributes map[string]string) (bool, error) {
    // Build URL with parameters
    params := url.Values{}
    params.Add("user_id", userID)
    
    for key, value := range userAttributes {
        params.Add(key, value)
    }
    
    url := fmt.Sprintf("%s/flags/%s?%s", c.BaseURL, flagName, params.Encode())
    
    resp, err := c.HTTPClient.Get(url)
    if err != nil {
        return false, fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return false, fmt.Errorf("API returned status %d", resp.StatusCode)
    }
    
    var flagResp FlagResponse
    if err := json.NewDecoder(resp.Body).Decode(&flagResp); err != nil {
        return false, fmt.Errorf("failed to decode response: %w", err)
    }
    
    return flagResp.Enabled, nil
}

// Usage
func main() {
    client := NewOptiForkClient("http://localhost:8000")
    
    userAttributes := map[string]string{
        "country": "US",
        "plan":    "premium",
    }
    
    enabled, err := client.CheckFlag("new_feature", "user123", userAttributes)
    if err != nil {
        fmt.Printf("Error checking flag: %v\n", err)
        enabled = false // Fail closed
    }
    
    if enabled {
        fmt.Println("New feature is enabled!")
        // Use new feature
    } else {
        fmt.Println("Using legacy feature")
        // Use old feature
    }
}`
      }
    ]
  },
  {
    language: "curl",
    name: "cURL/HTTP",
    examples: [
      {
        title: "Basic API Calls",
        description: "Direct HTTP API usage examples",
        code: `# === FEATURE FLAGS ===

# Check a feature flag
curl "http://localhost:8000/flags/new_checkout_flow?user_id=user123&country=US&plan=premium"

# Response:
# {
#   "flag": "new_checkout_flow",
#   "user_id": "user123", 
#   "enabled": true
# }

# Create a new flag
curl -X POST "http://localhost:8000/flags" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "dark_mode",
    "description": "Enable dark mode for users",
    "rollout": 0.5,
    "rules": [
      {
        "field": "plan",
        "op": "eq", 
        "value": "premium"
      }
    ]
  }'

# Update a flag
curl -X PUT "http://localhost:8000/flags/dark_mode" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "dark_mode",
    "description": "Enable dark mode for premium users",
    "rollout": 0.8,
    "rules": [
      {
        "field": "plan",
        "op": "eq",
        "value": "premium" 
      }
    ]
  }'

# === REMOTE CONFIGS ===

# Get all remote configs
curl "http://localhost:8000/configs"

# Create a remote config
curl -X POST "http://localhost:8000/configs" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "app_theme",
    "description": "Application theme settings",
    "config_data": {
      "primary_color": "#007bff",
      "dark_mode_enabled": true,
      "sidebar_collapsed": false,
      "max_items_per_page": 50
    },
    "environment": "production",
    "is_active": true
  }'

# Get specific config
curl "http://localhost:8000/configs/1"

# Update config
curl -X PUT "http://localhost:8000/configs/1" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "app_theme",
    "description": "Updated theme settings",
    "config_data": {
      "primary_color": "#28a745",
      "dark_mode_enabled": false,
      "sidebar_collapsed": true,
      "max_items_per_page": 100
    },
    "environment": "production",
    "is_active": true
  }'

# === USER SEGMENTS ===

# Get all user segments
curl "http://localhost:8000/segments"

# Create a user segment
curl -X POST "http://localhost:8000/segments" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "premium_users",
    "description": "Premium subscription users",
    "criteria": {
      "subscription_tier": "premium",
      "account_age_days": 30,
      "monthly_usage_gb": 100
    },
    "is_active": true
  }'

# Create geographic segment
curl -X POST "http://localhost:8000/segments" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "us_users",
    "description": "Users located in United States",
    "criteria": {
      "country": "US",
      "timezone": ["EST", "CST", "MST", "PST"]
    },
    "is_active": true
  }'

# Get specific segment
curl "http://localhost:8000/segments/1"

# === EXPERIMENTS ===

# Assign user to experiment variant
curl "http://localhost:8000/experiments/homepage_redesign/assign?user_id=user123&country=US&plan=premium"

# Response:
# {
#   "experiment": "homepage_redesign",
#   "user_id": "user123",
#   "variant": "variant_a"
# }

# Create an experiment
curl -X POST "http://localhost:8000/experiments" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "button_color_test",
    "description": "Test different button colors",
    "flag_id": 1,
    "variants": [
      {"name": "control", "traffic_split": 0.5},
      {"name": "red_button", "traffic_split": 0.3},
      {"name": "green_button", "traffic_split": 0.2}
    ]
  }'

# Get all experiments
curl "http://localhost:8000/experiments"

# Get flag exposures
curl "http://localhost:8000/flags/dark_mode/exposures?limit=50"

# Get all exposures  
curl "http://localhost:8000/exposures?limit=100"`
      }
    ]
  }
];

function IntegrationGuide() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("javascript");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, title: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(title);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const selectedExample = codeExamples.find(ex => ex.language === selectedLanguage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">Integration Guide</h2>
            <p className="text-gray-600 text-sm">
              Learn how to integrate OptiFork feature flags into your application
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {codeExamples.map(example => (
            <button
              key={example.language}
              onClick={() => setSelectedLanguage(example.language)}
              className={`px-4 py-2 font-medium transition-all ${
                selectedLanguage === example.language
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>

        {/* API Endpoint Info */}
        <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
          <h3 className="font-medium text-gray-800 mb-3">API Endpoints</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 mb-2">Feature Flags</h4>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Base URL:</strong> http://localhost:8000
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Check Flag:</strong><br/>
                GET /flags/{"{flag_name}"}?user_id={"{user_id}"}&{"{...attributes}"}
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2 text-xs">
                <strong>Response:</strong><br/>
                {`{ "flag": "...", "user_id": "...", "enabled": true }`}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 mb-2">Experiments</h4>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Assign User:</strong><br/>
                GET /experiments/{"{experiment_name}"}/assign?user_id={"{user_id}"}&{"{...attributes}"}
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2 text-xs">
                <strong>Response:</strong><br/>
                {`{ "experiment": "...", "user_id": "...", "variant": "control" }`}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 mb-2">Remote Configs</h4>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Get All:</strong><br/>
                GET /configs
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Create:</strong><br/>
                POST /configs
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2 text-xs">
                <strong>Response:</strong><br/>
                {`{ "name": "...", "config_data": {...}, "is_active": true }`}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 mb-2">User Segments</h4>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Get All:</strong><br/>
                GET /segments
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2">
                <strong>Create:</strong><br/>
                POST /segments
              </div>
              <div className="font-mono bg-gray-100 px-3 py-2 text-xs">
                <strong>Response:</strong><br/>
                {`{ "name": "...", "criteria": {...}, "is_active": true }`}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200">
            <p className="text-gray-700 text-sm">
              <strong>Tip:</strong> Use remote configs for dynamic application settings, user segments for targeted experiences, 
              and feature flags combined with experiments for A/B testing. All endpoints support caching for better performance.
            </p>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      {selectedExample && (
        <div className="space-y-6">
          {selectedExample.examples.map((example, index) => (
            <div key={index} className="bg-white border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800">{example.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{example.description}</p>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(example.code, example.title)}
                  className={`absolute top-4 right-4 px-3 py-1 text-xs font-medium transition-all ${
                    copiedCode === example.title
                      ? 'bg-gray-200 text-gray-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copiedCode === example.title ? 'Copied!' : 'Copy'}
                </button>
                
                <pre className="p-6 text-sm overflow-x-auto bg-gray-900 text-gray-100">
                  <code>{example.code}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Best Practices */}
      <div className="bg-white border border-gray-200 p-6">
        <h3 className="text-xl font-medium text-gray-900 mb-4 flex items-center">
          Best Practices
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-gray-400 mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Fail Closed</h4>
              <p className="text-gray-600 text-sm">Always default to the safe behavior (usually the old feature) when the flag service is unavailable.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-gray-400 mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Cache Responsibly</h4>
              <p className="text-gray-600 text-sm">Consider caching flag values for a short period (1-5 minutes) to reduce API calls, but ensure timely updates.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-gray-400 mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Consistent User Experience</h4>
              <p className="text-gray-600 text-sm">Once a user sees a feature, they should continue to see it during their session to avoid confusion.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-gray-400 mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Monitor Performance</h4>
              <p className="text-gray-600 text-sm">Set timeouts for flag checks (recommended: 100-500ms) to avoid blocking your application.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-gray-400 mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Clean Up Old Flags</h4>
              <p className="text-gray-600 text-sm">Remove feature flag code once features are fully rolled out or permanently disabled.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationGuide;