# Contributing to OptiFork >

Thank you for your interest in contributing to OptiFork! We welcome contributions from developers of all skill levels. This guide will help you get started.

## =Ë Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [maintainers@optifork.com](mailto:maintainers@optifork.com).

## Getting Started

### Prerequisites

- **Git** - Version control
- **Docker & Docker Compose** - For development environment
- **Python 3.8+** - Backend development
- **Node.js 16+** - Frontend development
- **PostgreSQL** (optional) - For production database testing
- **Redis** (optional) - For caching testing

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/optifork.git
   cd optifork
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/optifork.git
   ```

## Development Setup

### Quick Setup with Docker

```bash
# Start development environment
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Manual Setup

#### Backend Development

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt

# Copy environment file
cp ../.env.example .env

# Run database migrations
python -c "from db import init_database; import asyncio; asyncio.run(init_database())"

# Start development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- = **Bug fixes**
- ( **New features**
- =Ú **Documentation improvements**
- >ê **Tests**
- <¨ **UI/UX improvements**
- ¡ **Performance optimizations**
- =' **DevOps and tooling**

### Contribution Workflow

1. **Check existing issues** to see if your idea is already being discussed
2. **Create an issue** for new features or major changes
3. **Get feedback** from maintainers before starting work
4. **Create a feature branch** from `main`
5. **Make your changes** with appropriate tests
6. **Submit a pull request** with a clear description

### Finding Issues to Work On

- <÷ **Good First Issue**: Great for newcomers
- <˜ **Help Wanted**: Issues where we need community help
- = **Bug**: Confirmed bugs that need fixing
- ( **Enhancement**: New features or improvements

Filter issues by these labels on GitHub to find something that matches your interests and skill level.

## Coding Standards

### Backend (Python)

We follow **PEP 8** style guidelines with some project-specific conventions:

```python
# Use type hints
def create_flag(name: str, rollout: float) -> Dict[str, Any]:
    pass

# Use async/await for database operations
async def get_flag_by_name(db: AsyncSession, name: str) -> Optional[FeatureFlag]:
    pass

# Use descriptive variable names
feature_flag_exposure_count = len(exposures)

# Use docstrings for functions and classes
def evaluate_flag(flag_name: str, user_id: str) -> bool:
    """
    Evaluate if a feature flag is enabled for a user.
    
    Args:
        flag_name: Name of the feature flag
        user_id: Unique identifier for the user
        
    Returns:
        Boolean indicating if flag is enabled
    """
    pass
```

#### Code Formatting

We use **Black** for code formatting:

```bash
# Format code
black .

# Check formatting
black --check .
```

#### Linting

We use **flake8** for linting:

```bash
# Check code quality
flake8 .

# With specific config
flake8 --config setup.cfg
```

### Frontend (React/TypeScript)

We follow **TypeScript** and **React** best practices:

```typescript
// Use TypeScript interfaces
interface FeatureFlag {
  id: number;
  name: string;
  rollout: number;
  enabled: boolean;
}

// Use functional components with hooks
const FeatureFlagList: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  
  useEffect(() => {
    fetchFlags();
  }, []);
  
  return (
    <div className="flag-list">
      {flags.map(flag => (
        <FlagCard key={flag.id} flag={flag} />
      ))}
    </div>
  );
};

// Use descriptive prop types
interface FlagCardProps {
  flag: FeatureFlag;
  onToggle?: (flagId: number) => void;
}
```

#### Code Formatting

We use **Prettier** for code formatting:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

#### Linting

We use **ESLint** for linting:

```bash
# Check code quality
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing Guidelines

### Backend Testing

We use **pytest** for backend testing:

```python
# Test file example: test_flags.py
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_create_flag():
    response = client.post("/flags", json={
        "name": "test_flag",
        "description": "Test flag",
        "rollout": 0.5,
        "rules": []
    })
    assert response.status_code == 200
    
def test_evaluate_flag():
    # Setup
    flag_data = {...}
    
    # Test
    response = client.get(f"/flags/test_flag?user_id=test_user")
    
    # Assertions
    assert response.status_code == 200
    assert "enabled" in response.json()
```

Run backend tests:
```bash
cd backend
pytest
pytest --coverage  # With coverage report
pytest -v         # Verbose output
```

### Frontend Testing

We use **Jest** and **React Testing Library**:

```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import FlagCard from './FlagCard';

const mockFlag = {
  id: 1,
  name: 'test_flag',
  rollout: 0.5,
  enabled: true
};

test('renders flag name and rollout', () => {
  render(<FlagCard flag={mockFlag} />);
  
  expect(screen.getByText('test_flag')).toBeInTheDocument();
  expect(screen.getByText('50%')).toBeInTheDocument();
});

test('calls onToggle when clicked', () => {
  const onToggleMock = jest.fn();
  render(<FlagCard flag={mockFlag} onToggle={onToggleMock} />);
  
  fireEvent.click(screen.getByRole('button'));
  expect(onToggleMock).toHaveBeenCalledWith(1);
});
```

Run frontend tests:
```bash
cd frontend
npm test
npm run test:coverage  # With coverage
```

### Integration Testing

For end-to-end testing, we use **Docker Compose** to spin up the full stack:

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
pytest tests/integration/

# Cleanup
docker-compose -f docker-compose.test.yml down
```

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run all tests** locally
4. **Format and lint** your code
5. **Update CHANGELOG.md** if applicable

### PR Checklist

- [ ] **Branch**: Created from latest `main`
- [ ] **Tests**: All tests pass locally
- [ ] **Linting**: Code passes all style checks
- [ ] **Documentation**: Updated if needed
- [ ] **Description**: Clear description of changes
- [ ] **Issue**: Links to related issue(s)
- [ ] **Screenshots**: For UI changes

### PR Template

When creating a PR, use this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors/warnings

## Related Issues
Fixes #123
```

### Review Process

1. **Automated checks** run on all PRs
2. **Code review** by at least one maintainer
3. **Testing** in staging environment
4. **Approval** and merge by maintainer

## Issue Guidelines

### Bug Reports

Use the bug report template and include:

- **Environment details** (OS, browser, Docker version)
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Screenshots or logs** if applicable
- **Possible solutions** if you have ideas

### Feature Requests

Use the feature request template and include:

- **Problem description** - What problem does this solve?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other approaches you've thought of
- **Additional context** - Mockups, examples, etc.

### Issue Labels

- = **bug**: Something isn't working
- ( **enhancement**: New feature or request
- =Ú **documentation**: Improvements or additions to docs
- <÷ **good first issue**: Good for newcomers
- <˜ **help wanted**: Extra attention is needed
- S **question**: Further information is requested
- =« **wontfix**: This will not be worked on

## Development Guidelines

### Git Workflow

We use **Git Flow** with the following branches:

- `main`: Production-ready code
- `develop`: Development branch (integration)
- `feature/*`: Feature branches
- `bugfix/*`: Bug fix branches
- `hotfix/*`: Production hotfixes

### Commit Messages

Follow **Conventional Commits** format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```bash
feat(flags): add percentage rollout support
fix(auth): resolve login redirect issue
docs(api): update authentication endpoints
test(flags): add unit tests for flag evaluation
```

### Database Migrations

For database schema changes:

1. **Create migration script** in `backend/migrations/`
2. **Test migration** on sample data
3. **Document breaking changes** in PR description
4. **Update model definitions** in `models.py`

### API Design

Follow **RESTful** conventions:

- Use proper HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)
- Use meaningful resource URLs (`/flags`, `/experiments`)
- Return appropriate status codes
- Include proper error messages
- Follow OpenAPI specification

### Security Considerations

- **Never commit secrets** or credentials
- **Validate all inputs** on backend
- **Use parameterized queries** to prevent SQL injection
- **Implement proper authentication** for protected endpoints
- **Follow OWASP security guidelines**

## Community

### Communication Channels

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: [Join our community](https://discord.gg/optifork) (coming soon)
- **Email**: [maintainers@optifork.com](mailto:maintainers@optifork.com)

### Getting Help

If you need help:

1. **Check documentation** first
2. **Search existing issues** and discussions
3. **Ask in GitHub Discussions** for general questions
4. **Create an issue** for bugs or specific problems
5. **Join our Discord** for real-time chat

### Recognition

Contributors are recognized in:

- **README.md** contributors section
- **CHANGELOG.md** for significant contributions
- **GitHub releases** notes
- **Social media** shoutouts for major contributions

## Release Process

### Version Numbering

We follow **Semantic Versioning** (SemVer):

- `MAJOR.MINOR.PATCH` (e.g., `1.2.3`)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

For maintainers releasing new versions:

1. **Update version** in `package.json` and `setup.py`
2. **Update CHANGELOG.md** with new features and fixes
3. **Create release branch** from `develop`
4. **Test thoroughly** in staging environment
5. **Merge to main** and tag release
6. **Deploy to production**
7. **Announce release** in community channels

## Thank You! =O

Thank you for taking the time to contribute to OptiFork. Your efforts help make this project better for everyone in the feature flag and A/B testing community.

If you have questions about contributing, don't hesitate to ask. We're here to help and excited to work with you!

---

**Happy coding!** =€