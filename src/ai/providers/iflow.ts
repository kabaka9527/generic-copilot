import { createOpenAICompatible, OpenAICompatibleProviderSettings } from "@ai-sdk/openai-compatible";
import { ProviderClient } from "../providerClient";
import type { ProviderConfig, ModelItem } from "../../types";
import type { JSONValue } from "ai";
import * as vscode from "vscode";
import * as http from "http";
import { randomBytes } from "crypto";
import { logger } from "../../outputLogger";

const IFLOW_OAUTH_AUTHORIZE_ENDPOINT = "https://iflow.cn/oauth";
const IFLOW_OAUTH_TOKEN_ENDPOINT = "https://iflow.cn/oauth/token";
const IFLOW_USERINFO_ENDPOINT = "https://iflow.cn/api/oauth/getUserInfo";

// Client credentials come from the reference implementation in CLIProxyAPI.
const IFLOW_OAUTH_CLIENT_ID = "10009311001";
const IFLOW_OAUTH_CLIENT_SECRET = "4Z3YjXycVsQvyGF1etiNlIBB4RsqSDtW";

const IFLOW_DEFAULT_BASE_URL = "https://apis.iflow.cn/v1";
const IFLOW_CALLBACK_PORT = 11451;
const TOKEN_REFRESH_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

type OAuthTokenResponse = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type?: string;
	scope?: string;
};

type UserInfoResponse = {
	success: boolean;
	data: {
		apiKey: string;
		email?: string;
		phone?: string;
	};
};

export interface IFlowTokenStorage {
	accessToken: string;
	refreshToken: string;
	lastRefresh: string; // RFC3339
	expire: string; // RFC3339
	apiKey: string;
	email: string;
	tokenType?: string;
	scope?: string;
};

export class IFlowProviderClient extends ProviderClient {
	private readonly secrets: vscode.SecretStorage;
	private refreshTimer: NodeJS.Timeout | null = null;

	constructor(config: ProviderConfig, apiKey: string, secrets: vscode.SecretStorage) {
		super(
			"iflow",
			config,
			createOpenAICompatible({
				apiKey: apiKey || "placeholder-key",
				baseURL: config.baseUrl || IFLOW_DEFAULT_BASE_URL,
				...(config.headers && { headers: config.headers }),
			} as OpenAICompatibleProviderSettings)
		);
		this.secrets = secrets;
		this.startTokenRefreshLoop();
	}

	async initiateOAuth(): Promise<void> {
		const providerId = this.config.id;
		logger.info(`iFlow OAuth: starting for provider ${providerId}`);

		const state = this.generateState();
		const redirectUri = `http://localhost:${IFLOW_CALLBACK_PORT}/oauth2callback`;
		const authUrl = this.buildAuthorizationUrl(state, redirectUri);

		const { codePromise, close } = await this.startOAuthCallbackServer(state);
		try {
			await vscode.env.openExternal(vscode.Uri.parse(authUrl));
			const code = await codePromise;
			const storage = await this.exchangeCodeForStorage(code, redirectUri);
			await this.saveTokenStorage(storage);
			await this.secrets.store(this.getApiKeySecretKey(), storage.apiKey);
			this.updateProviderApiKey(storage.apiKey);
			vscode.window.showInformationMessage(vscode.l10n.t("message.iflowOAuthSuccess", providerId));
		} finally {
			close();
		}
	}

	private startTokenRefreshLoop(): void {
		if (this.refreshTimer) {
			return;
		}
		// fire-and-forget initial refresh attempt
		void this.maybeRefreshTokens();
		this.refreshTimer = setInterval(() => {
			void this.maybeRefreshTokens();
		}, TOKEN_REFRESH_CHECK_INTERVAL_MS);
	}

	private async maybeRefreshTokens(): Promise<void> {
		try {
			const stored = await this.loadTokenStorage();
			if (!stored) {
				return;
			}

			// Ensure API key secret exists for normal request path.
			const existingApiKey = await this.secrets.get(this.getApiKeySecretKey());
			if (!existingApiKey && stored.apiKey) {
				await this.secrets.store(this.getApiKeySecretKey(), stored.apiKey);
				this.updateProviderApiKey(stored.apiKey);
			}

			const expireMs = Date.parse(stored.expire);
			if (!Number.isFinite(expireMs)) {
				logger.warn(`iFlow OAuth: invalid expire timestamp for provider ${this.config.id}`);
				return;
			}
			const now = Date.now();
			if (expireMs - now > REFRESH_THRESHOLD_MS) {
				return;
			}

			logger.info(`iFlow OAuth: refreshing tokens for provider ${this.config.id}`);
			const refreshed = await this.refreshTokenStorage(stored.refreshToken);
			await this.saveTokenStorage(refreshed);
			await this.secrets.store(this.getApiKeySecretKey(), refreshed.apiKey);
			this.updateProviderApiKey(refreshed.apiKey);
			logger.info(`iFlow OAuth: token refresh succeeded for provider ${this.config.id}`);
		} catch (error) {
			logger.error(`iFlow OAuth: token refresh failed for provider ${this.config.id}`, error);
			// Don't crash the extension; just log and continue with existing (possibly expired) credentials
		}
	}

	private updateProviderApiKey(apiKey: string): void {
		try {
			// Recreate the provider instance with the new apiKey.
			// Vercel AI SDK provider instances don't expose a direct way to update apiKey after creation.
			this.providerInstance = createOpenAICompatible({
				apiKey,
				baseURL: this.config.baseUrl || IFLOW_DEFAULT_BASE_URL,
				...(this.config.headers && { headers: this.config.headers }),
			} as OpenAICompatibleProviderSettings);
			logger.debug(`iFlow OAuth: recreated provider instance with new apiKey for provider ${this.config.id}`);
		} catch (e) {
			logger.warn(
				`iFlow OAuth: failed to recreate provider instance with new apiKey: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}

	private buildAuthorizationUrl(state: string, redirectUri: string): string {
		const params = new URLSearchParams({
			loginMethod: "phone",
			type: "phone",
			redirect: redirectUri,
			state,
			client_id: IFLOW_OAUTH_CLIENT_ID,
		});
		return `${IFLOW_OAUTH_AUTHORIZE_ENDPOINT}?${params.toString()}`;
	}

	private generateState(): string {
		return randomBytes(16).toString("hex");
	}

	private async startOAuthCallbackServer(state: string): Promise<{ codePromise: Promise<string>; close: () => void }> {
		let server: http.Server | undefined;
		let resolved = false;

		const codePromise = new Promise<string>((resolve, reject) => {
			const timeout = setTimeout(() => {
				if (!resolved) {
					reject(new Error("OAuth callback timed out"));
				}
			}, 2 * 60 * 1000);

			server = http.createServer((req, res) => {
				try {
					if (!req.url) {
						res.statusCode = 400;
						res.end("Missing url");
						return;
					}

					const url = new URL(req.url, `http://localhost:${IFLOW_CALLBACK_PORT}`);
					if (url.pathname !== "/oauth2callback") {
						res.statusCode = 404;
						res.end("Not found");
						return;
					}

					const code = url.searchParams.get("code") ?? "";
					const gotState = url.searchParams.get("state") ?? "";
					if (!code || gotState !== state) {
						res.statusCode = 400;
						res.end("Invalid OAuth callback");
						return;
					}

					resolved = true;
					clearTimeout(timeout);
					res.statusCode = 200;
					res.setHeader("Content-Type", "text/html; charset=utf-8");
					res.end("<html><body>iFlow OAuth success. You can close this window.</body></html>");
					resolve(code);
				} catch (err) {
					reject(err);
				}
			});
			server.on("error", reject);
			server.listen(IFLOW_CALLBACK_PORT, "127.0.0.1");
		});

		const close = () => {
			try {
				server?.close();
			} catch {
				// ignore
			}
		};
		return { codePromise, close };
	}

	private async exchangeCodeForStorage(code: string, redirectUri: string): Promise<IFlowTokenStorage> {
		const token = await this.exchangeCodeForTokens(code, redirectUri);
		const expire = new Date(Date.now() + token.expires_in * 1000).toISOString();
		const userInfo = await this.fetchUserInfo(token.access_token);
		const apiKey = (userInfo.data.apiKey || "").trim();
		if (!apiKey) {
			throw new Error("iFlow OAuth: empty apiKey returned");
		}
		const email = (userInfo.data.email || userInfo.data.phone || "").trim();
		if (!email) {
			throw new Error("iFlow OAuth: missing account email/phone");
		}

		return {
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			lastRefresh: new Date().toISOString(),
			expire,
			apiKey,
			email,
			tokenType: token.token_type,
			scope: token.scope,
		};
	}

	private async refreshTokenStorage(refreshToken: string): Promise<IFlowTokenStorage> {
		const token = await this.refreshTokens(refreshToken);
		const expire = new Date(Date.now() + token.expires_in * 1000).toISOString();
		const userInfo = await this.fetchUserInfo(token.access_token);
		const apiKey = (userInfo.data.apiKey || "").trim();
		if (!apiKey) {
			throw new Error("iFlow OAuth: empty apiKey returned during refresh");
		}
		const email = (userInfo.data.email || userInfo.data.phone || "").trim();
		if (!email) {
			throw new Error("iFlow OAuth: missing account email/phone during refresh");
		}

		return {
			accessToken: token.access_token,
			refreshToken: token.refresh_token,
			lastRefresh: new Date().toISOString(),
			expire,
			apiKey,
			email,
			tokenType: token.token_type,
			scope: token.scope,
		};
	}

	private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokenResponse> {
		const form = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			client_id: IFLOW_OAUTH_CLIENT_ID,
			client_secret: IFLOW_OAUTH_CLIENT_SECRET,
		});
		return this.doTokenRequest(form);
	}

	private async refreshTokens(refreshToken: string): Promise<OAuthTokenResponse> {
		const form = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: IFLOW_OAUTH_CLIENT_ID,
			client_secret: IFLOW_OAUTH_CLIENT_SECRET,
		});
		return this.doTokenRequest(form);
	}

	private async doTokenRequest(form: URLSearchParams): Promise<OAuthTokenResponse> {
		const basic = Buffer.from(`${IFLOW_OAUTH_CLIENT_ID}:${IFLOW_OAUTH_CLIENT_SECRET}`, "utf8").toString("base64");
		const resp = await fetch(IFLOW_OAUTH_TOKEN_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Accept": "application/json",
				"Authorization": `Basic ${basic}`,
			},
			body: form.toString(),
		});
		const body = await resp.text();
		if (!resp.ok) {
			logger.debug(`iFlow OAuth token request failed: status=${resp.status} body=${body}`);
			throw new Error(`iFlow OAuth token: ${resp.status} ${body.trim()}`);
		}
		const parsed = JSON.parse(body) as OAuthTokenResponse;
		if (!parsed.access_token) {
			throw new Error("iFlow OAuth token: missing access_token");
		}
		return parsed;
	}

	private async fetchUserInfo(accessToken: string): Promise<UserInfoResponse> {
		const endpoint = `${IFLOW_USERINFO_ENDPOINT}?accessToken=${encodeURIComponent(accessToken)}`;
		const resp = await fetch(endpoint, {
			method: "GET",
			headers: { "Accept": "application/json" },
		});
		const body = await resp.text();
		if (!resp.ok) {
			logger.debug(`iFlow userInfo request failed: status=${resp.status} body=${body}`);
			throw new Error(`iFlow userInfo: ${resp.status} ${body.trim()}`);
		}
		const parsed = JSON.parse(body) as UserInfoResponse;
		logger.debug(`iFlow userInfo response: success=${parsed?.success}, hasApiKey=${Boolean(parsed?.data?.apiKey)}, body=${body.slice(0, 500)}`);
		if (!parsed.success) {
			throw new Error(`iFlow userInfo: request not successful (success=${parsed?.success}, body=${body.slice(0, 200)})`);
		}
		return parsed;
	}

	private getTokenSecretKey(): string {
		return `generic-copilot.iflow.token.${this.config.id}`;
	}

	private getApiKeySecretKey(): string {
		return `generic-copilot.apiKey.${this.config.id}`;
	}

	private async loadTokenStorage(): Promise<IFlowTokenStorage | undefined> {
		const raw = await this.secrets.get(this.getTokenSecretKey());
		if (!raw) {
			return undefined;
		}
		try {
			return JSON.parse(raw) as IFlowTokenStorage;
		} catch (e) {
			logger.warn(
				`iFlow OAuth: invalid token storage JSON for provider ${this.config.id}: ${e instanceof Error ? e.message : String(e)}`
			);
			return undefined;
		}
	}

	private async saveTokenStorage(storage: IFlowTokenStorage): Promise<void> {
		await this.secrets.store(this.getTokenSecretKey(), JSON.stringify(storage));
	}

	async generateStreamingResponse(
		request: vscode.LanguageModelChatRequestMessage[],
		options: vscode.ProvideLanguageModelChatResponseOptions,
		config: ModelItem,
		progress: vscode.Progress<vscode.LanguageModelResponsePart2>,
		statusBarItem: vscode.StatusBarItem,
		providerOptions?: Record<string, Record<string, JSONValue>>
	): Promise<void> {
		// Best-effort refresh before making a request.
		await this.maybeRefreshTokens();
		return super.generateStreamingResponse(request, options, config, progress, statusBarItem, providerOptions);
	}
}