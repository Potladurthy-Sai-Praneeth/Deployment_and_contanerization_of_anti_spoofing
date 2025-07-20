# UI Testing Suite for Anti-Spoofing Face Recognition

This testing suite provides comprehensive unit and integration tests for the React UI components without requiring Docker containers to be running.

## Test Coverage

### 1. App Component Tests (`test_app.test.js`)
- **Navigation Testing**: Verifies tab switching between Authentication, Add User, and Manage Users
- **State Management**: Tests user addition callbacks and refresh triggers
- **UI Structure**: Validates component hierarchy and CSS class assignments
- **User Workflow**: Tests complete user addition flow and tab transitions

### 2. Component Tests (`test_components.test.js`)
- **AddUserTab Component**:
  - Form validation (required fields, file uploads)
  - Image preview functionality
  - Successful/failed user registration
  - Error handling for network issues
- **AuthenticationTab Component**:
  - Camera integration and image capture
  - Threshold adjustment
  - Authentication success/failure scenarios
  - Processing states and error handling
- **UserManagementTab Component**:
  - User list display and refresh functionality
  - User deletion with confirmation
  - Loading states and error handling
  - Empty state handling
- **CameraCapture Component**:
  - Camera initialization and error states
  - Image capture functionality
  - Disabled states during processing

### 3. API Service Tests (`test_api_service.test.js`)
- **Configuration**: Tests axios instance setup and environment variables
- **Authentication API**: 
  - Image data processing and FormData creation
  - Threshold parameter handling
  - Success/failure response handling
  - Error scenarios (spoofing, network issues)
- **User Management API**:
  - User addition with file uploads
  - User deletion with URL encoding
  - User list retrieval
  - Input validation and error handling
- **Health Check API**: Service availability testing
- **Error Handling**: Comprehensive error scenario coverage

### 4. Integration Tests (`test_integration.test.js`)
- **Complete User Workflows**: End-to-end user registration and authentication
- **Cross-Component Communication**: Tests data flow between components
- **State Synchronization**: Verifies UI updates after API operations
- **Error Recovery**: Tests graceful error handling across components
- **Loading States**: Validates UI feedback during async operations
- **Accessibility**: ARIA labels, focus management, and user experience

## Setup and Installation

1. Navigate to the tests directory:
```bash
cd "d:\Lecture Notes\Sample_projects\Deploying Anti Spoofing\tests\ui"
```

2. Install dependencies:
```bash
npm install
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD (no watch mode)
npm run test:ci
```

### Specific Test Categories

```bash
# Run only App component tests
npm run test:app

# Run only individual component tests
npm run test:components

# Run only API service tests
npm run test:api

# Run only integration tests
npm run test:integration

# Run unit tests only (App + Components)
npm run test:unit

# Run all tests with coverage
npm run test:all
```

## Test Features

### Mocking Strategy
- **API Calls**: All axios requests are mocked to prevent actual network calls
- **Camera/Webcam**: react-webcam is mocked to simulate camera functionality
- **File Operations**: URL.createObjectURL and File operations are mocked
- **Browser APIs**: window.confirm and other browser APIs are mocked

### Test Environment
- **Framework**: Jest with React Testing Library
- **Environment**: jsdom for DOM simulation
- **Babel**: Configured for JSX and modern JavaScript transformation
- **Coverage**: Tracks test coverage across all UI components

### Key Testing Patterns
- **Async Operations**: Proper handling of API calls with waitFor
- **Form Testing**: File uploads, input validation, and form submission
- **Error Scenarios**: Network errors, validation errors, and API failures
- **User Interactions**: Click events, form inputs, and navigation
- **State Changes**: Component state updates and prop changes

## API Endpoints Tested

The tests verify integration with these API endpoints:
- `POST /authenticate` - Face authentication with anti-spoofing
- `POST /addUser` - User registration with face embedding
- `GET /getAllUsers` - Retrieve list of registered users  
- `DELETE /deleteUser/{username}` - Remove user and associated data
- `GET /health` - Service health check

## Expected Test Results

When all tests pass, you should see:
- **App Tests**: ~10 test cases covering navigation and state management
- **Component Tests**: ~25+ test cases covering all component functionality  
- **API Tests**: ~30+ test cases covering all API interactions
- **Integration Tests**: ~15+ test cases covering complete workflows

Total: **80+ comprehensive test cases**

## Coverage Report

The coverage report includes:
- **Statements**: Line-by-line code execution coverage
- **Branches**: Conditional logic coverage (if/else statements)
- **Functions**: Function call coverage
- **Lines**: Physical line coverage

Coverage files are generated in:
- `coverage/` directory (HTML report)
- `coverage/lcov.info` (LCOV format for CI/CD)

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all UI source files exist in `../../UI/src/`
2. **Mock Issues**: Verify setupTests.js is properly configured
3. **Babel Errors**: Check .babelrc configuration for React presets
4. **Path Issues**: Verify file paths are correct for Windows environment

### Debug Mode

For debugging failing tests:
```bash
# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test test_components.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should handle user authentication"
```

## Mock Configurations

### Camera Mock
- Simulates successful camera initialization
- Provides mock screenshot data
- Handles camera error scenarios

### API Mock  
- Returns configurable responses for all endpoints
- Simulates network errors and timeouts
- Validates request parameters and headers

### File System Mock
- Handles file upload simulation
- Provides mock preview URLs
- Simulates file validation scenarios

## Best Practices

1. **Independent Tests**: Each test case is isolated and doesn't depend on others
2. **Realistic Data**: Tests use realistic mock data resembling actual API responses
3. **Error Coverage**: Both success and failure scenarios are tested
4. **Async Handling**: Proper async/await and waitFor usage for API calls
5. **Cleanup**: Tests clean up mocks and state between runs

This testing suite ensures the UI components work correctly without requiring the backend services to be running, making it ideal for development and CI/CD pipelines.
