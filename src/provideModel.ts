import * as vscode from "vscode";
import { CancellationToken, LanguageModelChatInformation } from "vscode";

import type { ModelItem, ProviderConfig } from "./types";
import { resolveModelWithProvider } from "./utils";

const DEFAULT_CONTEXT_LENGTH = 128000;
const DEFAULT_MAX_TOKENS = 8000;

/**
 * Get the list of available language models contributed by this provider
 * @param options Options which specify the calling context of this function
 * @param token A cancellation token which signals if the user cancelled the request or not
 * @returns A promise that resolves to the list of available language models
 */
export async function prepareLanguageModelChatInformation(
	_options: { silent: boolean },
	_token: CancellationToken,
	_secrets: vscode.SecretStorage,
	_userAgent: string
): Promise<LanguageModelChatInformation[]> {
	// Check for user-configured models first
	const config = vscode.workspace.getConfiguration();
	const userModels = config.get<ModelItem[]>("generic-copilot.models", []);

	let infos: LanguageModelChatInformation[];
	if (userModels && userModels.length > 0) {
		// Return user-provided models directly
		infos = userModels.map((m) => {
			// Resolve model configuration with provider inheritance
			const resolved = resolveModelWithProvider(m);

			// Get model properties and parameters using helper functions
			const props = resolved.model_properties;
			//const params = getModelParameters(resolved);

			const contextLen = props.context_length ?? DEFAULT_CONTEXT_LENGTH;
			const maxOutput = DEFAULT_MAX_TOKENS;
			const maxInput = Math.max(1, contextLen - maxOutput);

			// Build canonical ID using provider key and raw model id
			const modelId = resolved.configId
				? `${props.owned_by}/${resolved.id}::${resolved.configId}`
				: `${props.owned_by}/${resolved.id}`;
			// Compose human-friendly display name as providerDisplayName/modelDisplayName[::configId]
			const providers = config.get<ProviderConfig[]>("generic-copilot.providers", []);
			const providerMeta = providers.find((p) => p.key === props.owned_by);
			const providerDn =
				providerMeta?.displayName && providerMeta.displayName.trim().length > 0
					? providerMeta.displayName
					: props.owned_by;
			const modelDn =
				resolved.displayName && resolved.displayName.trim().length > 0 ? resolved.displayName : resolved.id;
			const modelName = resolved.configId
				? `${providerDn}/${modelDn}::${resolved.configId}`
				: `${providerDn}/${modelDn}`;

			return {
				id: modelId,
				name: modelName,
				detail: providerDn,
				tooltip: resolved.configId
					? `${props.owned_by}/${resolved.id}::${resolved.configId}`
					: `${props.owned_by}/${resolved.id}`,
				family: props.family ?? "generic",
				version: "1.0.0",
				maxInputTokens: maxInput,
				maxOutputTokens: maxOutput,
				capabilities: {
					toolCalling: true,
					imageInput: false,
				},
			} satisfies LanguageModelChatInformation;
		});
	} else {
		// No user-provided models and no generic API key fallback; return empty list
		infos = [];
	}

	// debug log
	// console.log("[Generic Compatible Model Provider] Loaded models:", infos);
	return infos;
}

// No generic API key helpers; provider-level keys only
