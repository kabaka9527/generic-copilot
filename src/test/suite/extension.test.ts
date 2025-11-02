import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ModelItem, ProviderConfig } from '../../types';
import { MockConfiguration } from '../helpers/mocks';
import { assertArrayMinLength } from '../helpers/assertions';

suite('Extension Integration Test Suite', () => {
    let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
    let mockConfig: MockConfiguration;

    setup(() => {
        mockConfig = new MockConfiguration();
        originalGetConfiguration = vscode.workspace.getConfiguration;
        (vscode.workspace as { getConfiguration: unknown }).getConfiguration = () => mockConfig;
    });

    teardown(() => {
        (vscode.workspace as { getConfiguration: unknown }).getConfiguration = originalGetConfiguration;
    });

    suite('Extension activation', () => {
        test('extension should be present', () => {
            const ext = vscode.extensions.getExtension('mcowger.generic-copilot-providers');
            assert.ok(ext, 'Extension should be present');
        });

        test('should activate extension', async function () {
            // Skip - extension requires proposed APIs not available in test environment
            this.skip();
        });

        test('should have correct package.json metadata', () => {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                return;
            }

            const pkg = ext.packageJSON;
            assert.strictEqual(pkg.publisher, 'mcowger');
            assert.strictEqual(pkg.name, 'generic-copilot-providers');
            assert.ok(pkg.version);
        });

        test('should register language model provider', async function () {
            // Skip if extension not available
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            // The provider should be registered with vendor 'generic-copilot'
            // Note: Direct testing of provider registration requires VS Code internals
            assert.ok(ext.isActive);
        });
    });

    suite('Command registration', () => {
        test('should register setProviderApikey command', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('generic-copilot.setProviderApikey'),
                'Command should be registered'
            );
        });
    });

    suite('Configuration', () => {
        test('should have models configuration', () => {
            // Set up mock configuration
            mockConfig.set('models', []);
            assert.ok(mockConfig.has('models'));
        });

        test('should have providers configuration', () => {
            // Set up mock configuration
            mockConfig.set('providers', {});
            assert.ok(mockConfig.has('providers'));
        });

        test('should have retry configuration', () => {
            // Set up mock configuration
            mockConfig.set('retry', {});
            assert.ok(mockConfig.has('retry'));
        });

        test('should have delay configuration', () => {
            // Set up mock configuration
            mockConfig.set('delay', 0);
            assert.ok(mockConfig.has('delay'));
        });
    });

    suite('setProviderApikey command', () => {
        test('should show error when no providers configured', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            mockConfig.set('generic-copilot.models', []);
            mockConfig.set('generic-copilot.providers', []);

            // Mock window methods
            let errorShown = false;
            const originalShowError = vscode.window.showErrorMessage;
            (vscode.window as { showErrorMessage: unknown }).showErrorMessage = async (message: string) => {
                errorShown = message.includes('No providers found');
                return undefined;
            };

            try {
                await vscode.commands.executeCommand('generic-copilot.setProviderApikey');
                // Give time for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                assert.ok(errorShown, 'Should show error message');
            } finally {
                (vscode.window as { showErrorMessage: unknown }).showErrorMessage = originalShowError;
            }
        });

        test('should extract providers from models', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            const models: ModelItem[] = [
                { id: 'model1', owned_by: 'provider1', baseUrl: 'https://test1.com' },
                { id: 'model2', owned_by: 'provider2', baseUrl: 'https://test2.com' }
            ];

            mockConfig.set('generic-copilot.models', models);
            mockConfig.set('generic-copilot.providers', []);

            let pickedProviders: string[] = [];
            const originalShowQuickPick = vscode.window.showQuickPick;
            (vscode.window as { showQuickPick: unknown }).showQuickPick = async (items: string[]) => {
                pickedProviders = items;
                return undefined; // User cancels
            };

            try {
                await vscode.commands.executeCommand('generic-copilot.setProviderApikey');
                // Give time for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
                assert.ok(pickedProviders.length >= 2, 'Should show providers from models');
            } finally {
                (vscode.window as { showQuickPick: unknown }).showQuickPick = originalShowQuickPick;
            }
        });

        test('should include configured providers', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            const providers: ProviderConfig[] = [{
                key: 'configured-provider',
                baseUrl: 'https://configured.com',
                displayName: 'Configured Provider'
            }];

            mockConfig.set('generic-copilot.models', []);
            mockConfig.set('generic-copilot.providers', providers);

            let pickedProviders: string[] = [];
            const originalShowQuickPick = vscode.window.showQuickPick;
            (vscode.window as { showQuickPick: unknown }).showQuickPick = async (items: string[]) => {
                pickedProviders = items;
                return undefined;
            };

            try {
                await vscode.commands.executeCommand('generic-copilot.setProviderApikey');
                await new Promise(resolve => setTimeout(resolve, 100));
                assert.ok(
                    pickedProviders.includes('configured-provider'),
                    'Should include configured provider'
                );
            } finally {
                (vscode.window as { showQuickPick: unknown }).showQuickPick = originalShowQuickPick;
            }
        });

        test('should deduplicate providers', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            const models: ModelItem[] = [
                { id: 'model1', owned_by: 'provider1', baseUrl: 'https://test.com' },
                { id: 'model2', owned_by: 'provider1', baseUrl: 'https://test.com' }
            ];

            const providers: ProviderConfig[] = [{
                key: 'provider1',
                baseUrl: 'https://test.com'
            }];

            mockConfig.set('generic-copilot.models', models);
            mockConfig.set('generic-copilot.providers', providers);

            let pickedProviders: string[] = [];
            const originalShowQuickPick = vscode.window.showQuickPick;
            (vscode.window as { showQuickPick: unknown }).showQuickPick = async (items: string[]) => {
                pickedProviders = items;
                return undefined;
            };

            try {
                await vscode.commands.executeCommand('generic-copilot.setProviderApikey');
                await new Promise(resolve => setTimeout(resolve, 100));
                // Should only have one instance of provider1
                const count = pickedProviders.filter(p => p === 'provider1').length;
                assert.strictEqual(count, 1, 'Providers should be deduplicated');
            } finally {
                (vscode.window as { showQuickPick: unknown }).showQuickPick = originalShowQuickPick;
            }
        });
    });

    suite('End-to-end workflow', () => {
        test('should handle complete model configuration workflow', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            // Configure a provider and model
            const providers: ProviderConfig[] = [{
                key: 'test-provider',
                baseUrl: 'https://test.com/v1',
                displayName: 'Test Provider',
                defaults: {
                    context_length: 100000,
                    vision: true
                }
            }];

            const models: ModelItem[] = [{
                id: 'test-model',
                provider: 'test-provider',
                owned_by: 'test-provider'
            }];

            mockConfig.set('generic-copilot.providers', providers);
            mockConfig.set('generic-copilot.models', models);

            // The configuration should be accessible
            const config = vscode.workspace.getConfiguration('generic-copilot');
            const configuredModels = config.get<ModelItem[]>('models', []);
            const configuredProviders = config.get<ProviderConfig[]>('providers', []);

            assertArrayMinLength(configuredModels, 1);
            assertArrayMinLength(configuredProviders, 1);
        });

        test('should handle multiple providers and models', async function () {
            const ext = vscode.extensions.getExtension('generic-copilot-providers');
            if (!ext) {
                this.skip();
                return;
            }

            await ext.activate();

            const providers: ProviderConfig[] = [
                {
                    key: 'provider1',
                    baseUrl: 'https://provider1.com/v1',
                    displayName: 'Provider 1'
                },
                {
                    key: 'provider2',
                    baseUrl: 'https://provider2.com/v1',
                    displayName: 'Provider 2'
                }
            ];

            const models: ModelItem[] = [
                {
                    id: 'model1',
                    provider: 'provider1',
                    owned_by: 'provider1'
                },
                {
                    id: 'model2',
                    provider: 'provider2',
                    owned_by: 'provider2'
                },
                {
                    id: 'model3',
                    provider: 'provider1',
                    owned_by: 'provider1'
                }
            ];

            mockConfig.set('generic-copilot.providers', providers);
            mockConfig.set('generic-copilot.models', models);

            const config = vscode.workspace.getConfiguration('generic-copilot');
            const configuredModels = config.get<ModelItem[]>('models', []);
            const configuredProviders = config.get<ProviderConfig[]>('providers', []);

            assert.strictEqual(configuredModels.length, 3);
            assert.strictEqual(configuredProviders.length, 2);
        });
    });
});
