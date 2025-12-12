import { ProviderClient } from "../providerClient";
import { Provider, streamText } from "ai";
import {
	Progress,
	LanguageModelChatRequestMessage,
	LanguageModelTextPart,
	LanguageModelThinkingPart, //part of proposed api
	LanguageModelToolCallPart,
	LanguageModelToolResultPart2,
	ProvideLanguageModelChatResponseOptions,
	LanguageModelResponsePart2 as LanguageModelResponsePart, //part of proposed api
	CancellationToken,
} from "vscode";
import { ProviderConfig, ModelItem } from "../../types";
import * as vscode from "vscode";
import { JSONValue } from "ai";
import { logger } from "../../outputLogger";
import { randomUUID } from "crypto";
import { LoggedRequest, LoggedResponse,MessageLogger } from "../utils/messageLogger";
import { normalizeToolInputs } from "../utils/conversion";

// Dynamic import for ESM module - using any type to avoid TS1479 error
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createClaudeCodeFn: any;
const loadClaudeCode = async () => {
	if (!createClaudeCodeFn) {
		const module = await import("ai-sdk-provider-claude-code");
		createClaudeCodeFn = module.createClaudeCode;
	}
	return createClaudeCodeFn;
};

export class ClaudeCodeProviderClient extends ProviderClient {
	private providerInitialized = false;

	constructor(config: ProviderConfig) {
		// Pass undefined initially, will be set lazily
		super("claude-code", config, undefined as unknown as Provider);
	}

	private async ensureProviderInitialized(): Promise<void> {
		if (this.providerInitialized) {
			return;
		}
		const createClaudeCode = await loadClaudeCode();
		const providerInstance = createClaudeCode({
			defaultSettings: {
				pathToClaudeCodeExecutable: "/Users/matt.cowger/.asdf/shims/claude",
				permissionMode: "bypassPermissions", // Ask for permissions
				systemPrompt: "",
				verbose: false,
				// logger: {
				// 	//debug: (message: string) => logger.debug(`Claude: ${message}`),
				// 	info: (message: string) => logger.info(`Claude: ${message}`),
				// 	warn: (message: string) => logger.warn(`Claude: ${message}`),
				// 	error: (message: string) => logger.error(`Claude: ${message}`),
				// },
			},
		});
		this.providerInstance = providerInstance;
		this.providerInitialized = true;
	}

	/**
	 * Provides Google-specific provider options for streaming responses.
	 * The base class handles providerMetadata caching for tool calls (e.g., thoughtSignature).
	 */
	async generateStreamingResponse(
		request: LanguageModelChatRequestMessage[],
		options: ProvideLanguageModelChatResponseOptions,
		config: ModelItem,
		progress: Progress<LanguageModelResponsePart>,
		statusBarItem: vscode.StatusBarItem,
		_providerOptions?: Record<string, Record<string, JSONValue>>
	): Promise<void> {
		await this.ensureProviderInitialized();
		const messages = this.convertMessages(request);
		//Log the incoming request as soon as possible.
		const messageLogger = MessageLogger.getInstance();
		const interactionId = messageLogger.addRequestResponse({
			type: "request",
			vscodeMessages: request,
			vscodeOptions: options,
			vercelMessages: messages,
			vercelTools: {},
			modelConfig: config,
		} as LoggedRequest);
		let streamError: any;
		const result = streamText({
			model: this.providerInstance.languageModel("haiku"),
			messages: messages.slice(1),
			maxRetries: 3,
			onError: ({ error }) => {
				logger.error(`Error during streaming response: ${error instanceof Error ? error.message : String(error)}`);
				streamError = error;
			},
		});
		const responseLog: LoggedResponse = {
			type: "response",
			textParts: [],
			thinkingParts: [],
			toolCallParts: [],
		};
		// Record start time for performance measurement
		const startTime = Date.now();

		// We need to handle fullStream to get tool calls
		for await (const part of result.fullStream) {
			if (part.type === "reasoning-delta") {
				const thinkingPart = new LanguageModelThinkingPart(`${part.text}`, part.id);
				responseLog.thinkingParts?.push(thinkingPart);
				progress.report(thinkingPart);
			} else if (part.type === "text-delta") {
				const textPart = new LanguageModelTextPart(`${part.text}`);
				responseLog.textParts?.push(textPart);
				progress.report(textPart);
			} else if (part.type === "tool-call") {
				const normalizedInput = normalizeToolInputs(part.toolName, part.input);
				const toolCall = new LanguageModelToolCallPart(part.toolCallId, part.toolName, normalizedInput as object);
				responseLog.toolCallParts?.push(toolCall);
				progress.report(new LanguageModelTextPart(`\n\`${part.toolName}\`: ${JSON.stringify(part.input)}\n`));
			} else {
				//logger.warn(`Unknown part type received from Claude Code: ${part.type}: ${JSON.stringify(part)}`);
			}
		}
		if (streamError) {
			throw streamError;
		}
		const endTime = Date.now();
		responseLog.durationMs = endTime - startTime;
		responseLog.usage = await result.usage;
		if (responseLog.usage?.outputTokens) {
			const durationSeconds = responseLog.durationMs / 1000;
			responseLog.tokensPerSecond = Math.round(responseLog.usage.outputTokens / durationSeconds);
		}
		messageLogger.addRequestResponse(responseLog, interactionId);
		return;

		// return super.generateStreamingResponse(request, options, config, progress, statusBarItem, _providerOptions);
	}
}
