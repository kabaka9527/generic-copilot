import * as vscode from "vscode";
import { TextDecoder } from "util";
import type { ModelItem, ProviderConfig } from "./types";
import { logger } from "./outputLogger";
import { IFlowProviderClient } from "./ai/providers/iflow";

export class ConfigurationPanel {
	public static currentPanel: ConfigurationPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private readonly _secrets: vscode.SecretStorage;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(context: vscode.ExtensionContext, extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		if (ConfigurationPanel.currentPanel) {
			ConfigurationPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			"genericCopilotConfig",
			vscode.l10n.t("configuration.title"),
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, "out"),
					vscode.Uri.joinPath(extensionUri, "assets"),
					vscode.Uri.joinPath(extensionUri, "webview-ui", "dist"),
				],
			}
		);

		ConfigurationPanel.currentPanel = new ConfigurationPanel(panel, extensionUri, context.secrets);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, secrets: vscode.SecretStorage) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._secrets = secrets;

		logger.debug("[ConfigurationPanel] Initializing configuration panel");
		this._update();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				logger.debug(`[ConfigurationPanel] Received message from webview: ${JSON.stringify(message)}`);
				switch (message.command) {
					case "save":
						logger.debug(
							`[ConfigurationPanel] Handling save command providersCount=${Array.isArray(message.providers) ? message.providers.length : "n/a"} modelsCount=${Array.isArray(message.models) ? message.models.length : "n/a"}`
						);
						await this._saveConfiguration(message.providers, message.models);
						return;
					case "openSettings":
						logger.debug("[ConfigurationPanel] Handling openSettings request from webview");
						// Ask VS Code to open the user settings.json editor
						await vscode.commands.executeCommand('workbench.action.openSettingsJson');
						return;
					case "load":
						logger.debug("[ConfigurationPanel] Handling load command from webview");
						await this._sendConfiguration();
						return;
					case "iflowOAuth":
						await this._handleIflowOAuth(message.provider as ProviderConfig | undefined);
						return;
					case "iflowClearAuth":
						await this._handleIflowClearAuth(message.provider as ProviderConfig | undefined);
						return;
					case "validateProvider":
						await this._handleValidateProvider(message.provider as ProviderConfig | undefined, message.model as ModelItem | undefined);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	private async _saveConfiguration(providers: ProviderConfig[], models: ModelItem[]) {
		try {
			logger.debug(
				`[ConfigurationPanel] _saveConfiguration called providersCount=${Array.isArray(providers) ? providers.length : "n/a"} modelsCount=${Array.isArray(models) ? models.length : "n/a"}`
			);
			const config = vscode.workspace.getConfiguration();
			const prevProviders = config.get<ProviderConfig[]>("generic-copilot.providers", []);
			const nextProviders = Array.isArray(providers) ? providers : [];

			// Clean up secrets for removed providers so deleting/re-adding doesn't keep OAuth state.
			try {
				const prevById = new Map<string, ProviderConfig>();
				for (const p of prevProviders) {
					if (p?.id) {
						prevById.set(p.id, p);
					}
				}
				const nextById = new Map<string, ProviderConfig>();
				for (const p of nextProviders) {
					if (p?.id) {
						nextById.set(p.id, p);
					}
				}

				for (const [prevId, prevProvider] of prevById.entries()) {
					const stillExists = nextById.has(prevId);
					const nextProvider = nextById.get(prevId);
					const iflowRemovedOrChangedAway =
						prevProvider?.vercelType === "iflow" && (!stillExists || nextProvider?.vercelType !== "iflow");
					const providerRemoved = !stillExists;

					if (providerRemoved) {
						// API keys are stored per provider id and should be removed when the provider is removed.
						await this._secrets.delete(`generic-copilot.apiKey.${prevId}`);
					}
					if (iflowRemovedOrChangedAway) {
						await this._secrets.delete(`generic-copilot.iflow.token.${prevId}`);
					}
				}
			} catch (cleanupError) {
				logger.warn(
					`[ConfigurationPanel] Failed to cleanup secrets for removed providers: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
				);
			}

			await config.update("generic-copilot.providers", providers, vscode.ConfigurationTarget.Global);
			await config.update("generic-copilot.models", models, vscode.ConfigurationTarget.Global);

			vscode.window.showInformationMessage("Configuration saved successfully!");

			// Send the updated configuration back to the webview
			await this._sendConfiguration();
		} catch (error) {
			logger.error("[ConfigurationPanel] Failed to save configuration", error);
			vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
		}
	}

	private async _sendConfiguration() {
		const config = vscode.workspace.getConfiguration();
		const providers = config.get<ProviderConfig[]>("generic-copilot.providers", []);
		const models = config.get<ModelItem[]>("generic-copilot.models", []);

		const iflowStatus: Record<
			string,
			{ loggedIn: boolean; expire?: string; lastRefresh?: string; email?: string }
		> = {};
		for (const p of providers) {
			if (!p?.id || p.vercelType !== "iflow") {
				continue;
			}
			try {
				const raw = await this._secrets.get(`generic-copilot.iflow.token.${p.id}`);
				if (!raw) {
					iflowStatus[p.id] = { loggedIn: false };
					continue;
				}
				const parsed = JSON.parse(raw) as any;
				iflowStatus[p.id] = {
					loggedIn: Boolean(parsed?.apiKey) && Boolean(parsed?.accessToken || parsed?.refreshToken),
					expire: typeof parsed?.expire === "string" ? parsed.expire : undefined,
					lastRefresh: typeof parsed?.lastRefresh === "string" ? parsed.lastRefresh : undefined,
					email: typeof parsed?.email === "string" ? parsed.email : undefined,
				};
			} catch (e) {
				logger.warn(
					`[ConfigurationPanel] Failed to read iFlow token status for provider ${p.id}: ${e instanceof Error ? e.message : String(e)}`
				);
				iflowStatus[p.id] = { loggedIn: false };
			}
		}

		logger.debug(
			`[ConfigurationPanel] Sending configuration to webview providersCount=${providers.length} modelsCount=${models.length}`
		);

		this._panel.webview.postMessage({
			command: "loadConfiguration",
			providers,
			models,
			iflowStatus,
			// Pass the current VS Code language
			vscodeLanguage: vscode.env.language,
		});
	}

	private async _handleIflowOAuth(provider: ProviderConfig | undefined): Promise<void> {
		if (!provider || provider.vercelType !== "iflow" || !provider.id) {
			vscode.window.showErrorMessage(vscode.l10n.t("message.iflowOAuthProviderMissing"));
			return;
		}
		const existingApiKey = await this._secrets.get(`generic-copilot.apiKey.${provider.id}`);
		const client = new IFlowProviderClient(provider, existingApiKey || "", this._secrets);
		await client.initiateOAuth();
		// Refresh UI so status/expiry updates immediately after login.
		await this._sendConfiguration();
	}

	private async _handleIflowClearAuth(provider: ProviderConfig | undefined): Promise<void> {
		if (!provider || provider.vercelType !== "iflow" || !provider.id) {
			vscode.window.showErrorMessage(vscode.l10n.t("message.iflowClearAuthProviderMissing"));
			return;
		}
		try {
			await this._secrets.delete(`generic-copilot.iflow.token.${provider.id}`);
			await this._secrets.delete(`generic-copilot.apiKey.${provider.id}`);
			vscode.window.showInformationMessage(vscode.l10n.t("message.iflowClearAuthSuccess", provider.id));
		} catch (e) {
			logger.error("[ConfigurationPanel] Failed to clear iFlow auth", e);
			vscode.window.showErrorMessage(
				vscode.l10n.t("message.iflowClearAuthFailed", e instanceof Error ? e.message : String(e))
			);
		}
		await this._sendConfiguration();
	}

	private async _handleValidateProvider(provider: ProviderConfig | undefined, model: ModelItem | undefined): Promise<void> {
		if (!provider || !provider.id) {
			vscode.window.showErrorMessage(vscode.l10n.t("message.validateProviderMissing"));
			return;
		}
		if (provider.vercelType !== "iflow") {
			vscode.window.showErrorMessage(vscode.l10n.t("message.validateProviderUnsupported"));
			return;
		}

		const apiKey = await this._secrets.get(`generic-copilot.apiKey.${provider.id}`);
		if (!apiKey) {
			vscode.window.showErrorMessage(vscode.l10n.t("message.iflowApiKeyMissing"));
			return;
		}

		if (!model || !model.slug) {
			vscode.window.showErrorMessage(vscode.l10n.t("message.validateModelMissing"));
			return;
		}

		const baseUrl = provider.baseUrl || "https://apis.iflow.cn/v1";
		const url = new URL("chat/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
		try {
			const resp = await fetch(url.toString(), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${apiKey}`,
					"Accept": "application/json",
					...(provider.headers ?? {}),
				},
				body: JSON.stringify({
					model: model.slug,
					messages: [{ role: "user", content: "ping" }],
					stream: false,
					max_tokens: 32,
					temperature: 0,
				}),
			});
			if (!resp.ok) {
				const body = await resp.text();
				logger.debug(`validateProvider iflow failed: url=${url.toString()} status=${resp.status} body=${body}`);
				vscode.window.showErrorMessage(vscode.l10n.t("message.validateProviderFailed", `${resp.status} ${body.trim()}`));
				return;
			}
			const json = (await resp.json()) as any;

			// Success should look like an OpenAI-compatible chat completion response.
			const choices = json?.choices;
			const isOpenAICompatibleCompletion = Array.isArray(choices) && choices.length >= 1;
			if (!isOpenAICompatibleCompletion) {
				// iFlow may return HTTP 200 with a business error payload like:
				// {"status":"435","msg":"Model not support","body":null}
				const hasStatus = typeof json?.status === "string" || typeof json?.status === "number";
				if (hasStatus) {
					const msg = typeof json?.msg === "string" ? json.msg : "Unknown error";
					vscode.window.showErrorMessage(
						vscode.l10n.t("message.validateProviderFailed", `${String(json.status)} ${msg}`)
					);
					return;
				}
				if (json?.error) {
					const errMsg =
						typeof json.error === "string"
							? json.error
							: typeof json.error?.message === "string"
								? json.error.message
								: "Unknown error";
					vscode.window.showErrorMessage(vscode.l10n.t("message.validateProviderFailed", errMsg));
					return;
				}

				// Unknown payload shape: treat as failure to avoid false positives.
				vscode.window.showErrorMessage(
					vscode.l10n.t(
						"message.validateProviderFailed",
						`Unexpected response shape: ${JSON.stringify(json).slice(0, 200)}`
					)
				);
				return;
			}

			const content =
				choices?.[0]?.message?.content ??
				choices?.[0]?.delta?.content ??
				choices?.[0]?.text ??
				"";
			const snippet = String(content || "").trim().slice(0, 200);
			vscode.window.showInformationMessage(
				vscode.l10n.t("message.validateProviderSuccessWithResponse", provider.id, model.slug, snippet || "(empty)")
			);
		} catch (e) {
			logger.error("validateProvider iflow error", e);
			vscode.window.showErrorMessage(vscode.l10n.t("message.validateProviderFailed", e instanceof Error ? e.message : String(e)));
		}
	}

	public dispose() {
		ConfigurationPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private async _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = await this._getReactHtml(webview);
	}

	private async _getReactHtml(webview: vscode.Webview) {
		const nonce = getNonce();
		const assetsRoot = vscode.Uri.joinPath(this._extensionUri, "webview-ui");
		const templatePath = vscode.Uri.joinPath(assetsRoot, "config.html");
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsRoot, "config.css"));
		const bundleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "webview-ui", "dist", "main.js"));

		const raw = await vscode.workspace.fs.readFile(templatePath);
		let html = new TextDecoder("utf-8").decode(raw);
		html = html
			.replaceAll("%CSP_SOURCE%", webview.cspSource)
			.replaceAll("%NONCE%", nonce)
			.replace("%CSS_URI%", cssUri.toString())
			.replace("%SCRIPT_URI%", bundleUri.toString());
		return html;
	}

}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
