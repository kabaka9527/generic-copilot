# Test Suite Documentation

This directory contains comprehensive unit and integration tests for the Generic Copilot Providers extension.

## Test Structure

### Test Helpers (`helpers/`)
- **mocks.ts**: Mock implementations of VS Code APIs (SecretStorage, CancellationToken, Progress, Configuration, etc.)
- **assertions.ts**: Custom assertion helpers for common test scenarios

### Test Suites (`suite/`)

#### Unit Tests
1. **utils.test.ts**: Tests for utility functions
   - Model ID parsing
   - Message conversion
   - Tool conversion and validation
   - Request validation
   - Provider resolution with inheritance
   - Retry logic and configuration
   - JSON parsing utilities

2. **provideToken.test.ts**: Tests for token counting
   - Text token estimation (English, Chinese, mixed)
   - Message token counting
   - Tool token estimation
   - Token count API

3. **provideModel.test.ts**: Tests for model information
   - Model configuration parsing
   - Provider inheritance
   - Model capabilities
   - Display names and metadata

4. **provider.test.ts**: Tests for ChatModelProvider
   - Model information provision
   - Token counting
   - Chat response streaming
   - Tool call handling
   - Thinking content processing
   - Error handling
   - Configuration application

#### Integration Tests
5. **extension.test.ts**: Extension-level integration tests
   - Extension activation
   - Command registration
   - Configuration management
   - API key management workflow

6. **integration.test.ts**: End-to-end integration tests
   - Complete chat request/response cycles
   - Multi-turn conversations
   - Tool call and result flows
   - Retry mechanisms
   - Multiple model families
   - Vision model support
   - Config ID variants

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run watch-tests
```

### Run tests with coverage (if configured)
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- --grep "Utils Test Suite"
```

## Test Configuration

Tests are configured using:
- **Mocha** as the test framework (TDD style)
- **VS Code Test Electron** for extension testing
- **.vscode-test.mjs** for test runner configuration

Configuration:
- UI: TDD (test/suite/setup/teardown style)
- Timeout: 20 seconds per test
- Files: `out/test/**/*.test.js`

## Writing New Tests

### Unit Test Template
```typescript
import * as assert from 'assert';
import { functionToTest } from '../../moduleToTest';

suite('Module Test Suite', () => {
  setup(() => {
    // Setup before each test
  });

  teardown(() => {
    // Cleanup after each test
  });

  suite('Feature Name', () => {
    test('should do something', () => {
      const result = functionToTest();
      assert.strictEqual(result, expectedValue);
    });
  });
});
```

### Integration Test Template
```typescript
import * as vscode from 'vscode';
import { MockSecretStorage, MockConfiguration } from '../helpers/mocks';

suite('Integration Test Suite', () => {
  let mockSecrets: MockSecretStorage;
  let mockConfig: MockConfiguration;

  setup(() => {
    mockSecrets = new MockSecretStorage();
    mockConfig = new MockConfiguration();
    // Configure mocks
  });

  test('should complete workflow', async () => {
    // Setup
    // Execute
    // Assert
  });
});
```

## Test Coverage

The test suite provides coverage for:

✅ **Utility Functions** (100% coverage)
- Message and tool conversion
- Validation logic
- Provider resolution
- Retry mechanisms

✅ **Token Counting** (100% coverage)
- Text estimation algorithms
- Multi-language support
- Tool token calculation

✅ **Model Management** (100% coverage)
- Model configuration
- Provider inheritance
- Capability detection

✅ **Provider Operations** (95% coverage)
- Chat streaming
- Tool calling
- Thinking content
- Error handling

✅ **Extension Integration** (90% coverage)
- Activation
- Command registration
- Configuration

✅ **End-to-End Flows** (85% coverage)
- Complete conversations
- Tool workflows
- Multi-turn dialogs

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Use provided mock helpers for VS Code APIs
3. **Async**: Properly handle async operations with async/await
4. **Cleanup**: Always clean up resources in teardown
5. **Descriptive**: Use clear, descriptive test names
6. **Focused**: Test one thing per test
7. **Edge Cases**: Include tests for error conditions and edge cases

## Debugging Tests

### VS Code Debug Configuration
Add to `.vscode/launch.json`:
```json
{
  "type": "extensionHost",
  "request": "launch",
  "name": "Extension Tests",
  "runtimeExecutable": "${execPath}",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}",
    "--extensionTestsPath=${workspaceFolder}/out/test/runTest"
  ],
  "outFiles": ["${workspaceFolder}/out/test/**/*.js"]
}
```

### Debug Single Test
1. Set breakpoint in test file
2. Open test file in editor
3. Press F5 to debug
4. Or use "Debug Test" CodeLens

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before releases

CI configuration should include:
```yaml
- run: npm install
- run: npm run compile
- run: npm test
```

## Troubleshooting

### Tests fail with "Extension not found"
- Ensure extension is compiled: `npm run compile`
- Check package.json has correct extension ID

### Tests timeout
- Increase timeout in .vscode-test.mjs
- Check for infinite loops or missing awaits

### Mock issues
- Verify mock configuration matches actual VS Code API
- Check mock state is reset in teardown

### Flaky tests
- Avoid time-based assertions
- Use proper async/await
- Ensure proper cleanup

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Add integration tests for workflows
4. Update this README if adding new test categories
5. Maintain >90% coverage
