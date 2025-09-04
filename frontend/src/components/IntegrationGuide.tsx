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
        code: `# Check a feature flag
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

# Get flag exposures
curl "http://localhost:8000/flags/dark_mode/exposures?limit=50"

# Get all exposures  
curl "http://localhost:8000/exposures?limit=100"

# === EXPERIMENT APIs ===

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

# JSON Attributes Example
curl "http://localhost:8000/experiments/checkout_test/assign" \\
  -G \\
  -d user_id=user456 \\
  -d country=CA \\
  -d age=28 \\
  -d plan=premium \\
  -d device=mobile \\
  -d returning_user=true`
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-purple-600 font-bold">🔌</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Integration Guide</h2>
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
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedLanguage === example.language
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {example.name}
            </button>
          ))}
        </div>

        {/* API Endpoint Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">🔗 API Endpoints</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-700 mb-2">📍 Feature Flags</h4>
              <div className="font-mono bg-blue-100 px-3 py-2 rounded">
                <strong>Base URL:</strong> http://localhost:8000
              </div>
              <div className="font-mono bg-blue-100 px-3 py-2 rounded">
                <strong>Check Flag:</strong><br/>
                GET /flags/{"{flag_name}"}?user_id={"{user_id}"}&{"{...attributes}"}
              </div>
              <div className="font-mono bg-blue-100 px-3 py-2 rounded text-xs">
                <strong>Response:</strong><br/>
                {`{ "flag": "...", "user_id": "...", "enabled": true }`}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-700 mb-2">🧪 Experiments</h4>
              <div className="font-mono bg-green-100 px-3 py-2 rounded">
                <strong>Assign User:</strong><br/>
                GET /experiments/{"{experiment_name}"}/assign?user_id={"{user_id}"}&{"{...attributes}"}
              </div>
              <div className="font-mono bg-green-100 px-3 py-2 rounded text-xs">
                <strong>Response:</strong><br/>
                {`{ "experiment": "...", "user_id": "...", "variant": "control" }`}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800 text-sm">
              <strong>💡 Tip:</strong> Pass user attributes as JSON in your application, then convert to URL parameters for API calls. 
              Both feature flags and experiments support the same attribute format.
            </p>
          </div>
        </div>
      </div>

      {/* Code Examples */}
      {selectedExample && (
        <div className="space-y-6">
          {selectedExample.examples.map((example, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">{example.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{example.description}</p>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => copyToClipboard(example.code, example.title)}
                  className={`absolute top-4 right-4 px-3 py-1 rounded text-xs font-medium transition-all ${
                    copiedCode === example.title
                      ? 'bg-green-100 text-green-700'
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">💡</span>
          Best Practices
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Fail Closed</h4>
              <p className="text-gray-600 text-sm">Always default to the safe behavior (usually the old feature) when the flag service is unavailable.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Cache Responsibly</h4>
              <p className="text-gray-600 text-sm">Consider caching flag values for a short period (1-5 minutes) to reduce API calls, but ensure timely updates.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Consistent User Experience</h4>
              <p className="text-gray-600 text-sm">Once a user sees a feature, they should continue to see it during their session to avoid confusion.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-800">Monitor Performance</h4>
              <p className="text-gray-600 text-sm">Set timeouts for flag checks (recommended: 100-500ms) to avoid blocking your application.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
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