import * as vscode from "vscode";
import { CancellationToken, LanguageModelChatInformation, LanguageModelChatRequestMessage } from "vscode";
import { logger } from "./outputLogger";

let estimateTokenCount: ((text: string) => number) | null = null;

async function loadEstimateTokenCount() {
	if (!estimateTokenCount) {
		const module = await import("tokenx");
		estimateTokenCount = module.estimateTokenCount;
	}
	return estimateTokenCount;
}
/**
 * Returns the number of tokens for a given text using the model specific tokenizer logic
 * @param model The language model to use
 * @param text The text to count tokens for
 * @param token A cancellation token for the request
 * @returns A promise that resolves to the number of tokens
 */



export async function prepareTokenCount(
	_model: LanguageModelChatInformation,
	text: LanguageModelChatRequestMessage,
	_token: CancellationToken
): Promise<number> {

	// For complex messages, calculate tokens for each part separately
	let totalTokens = 0;

	for (const part of text.content) {
		if (part instanceof vscode.LanguageModelTextPart) {
			// Estimate tokens directly for plain text
			totalTokens += await estimateTextTokens(part.value);
		} else if (part instanceof vscode.LanguageModelToolCallPart) {
			// Tool call token calculation
			totalTokens += await estimateToolTokens(part);
		} else if (part instanceof vscode.LanguageModelToolResultPart) {
			// Tool result token calculation
			const resultText = typeof part.content === "string" ? part.content : JSON.stringify(part.content);
			totalTokens += await estimateTextTokens(resultText);
		}
	}
	// Apply correction factor based on empirical observations
	totalTokens = Math.ceil(totalTokens * 1.0166);
	logger.debug(`Token count prepared: ${totalTokens}`);
	return totalTokens;
}


/** Roughly estimate tokens for VS Code chat messages (text only) */
export async function estimateMessagesTokens(msgs: readonly vscode.LanguageModelChatRequestMessage[]): Promise<number> {
	const estimateTokenCountFn = await loadEstimateTokenCount();
	let total = 0;
	for (const m of msgs) {
		for (const part of m.content) {
			if (part instanceof vscode.LanguageModelTextPart) {
				total += estimateTokenCountFn(part.value);
			}
		}
	}
	return total;
}

/** Token estimation for different content types */
export async function estimateTextTokens(text: string): Promise<number> {
	const estimateTokenCountFn = await loadEstimateTokenCount();
	return estimateTokenCountFn(text);
}

/** Rough token estimate for tool definitions by JSON size */
export async function estimateToolTokens(
	toolCall: vscode.LanguageModelToolCallPart
): Promise<number> {
	const estimateTokenCountFn = await loadEstimateTokenCount();
	let total = 0;
	total += estimateTokenCountFn(toolCall.name);
	total += estimateTokenCountFn(JSON.stringify(toolCall.input));
	total += estimateTokenCountFn(JSON.stringify(toolCall.callId));
	return total;
}
