import OpenAI from 'openai';
import { config } from '../config.js';

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * Creates an OpenAI-compatible client pointing at OpenRouter.
 * Throws `OpenRouterError` when no API key is configured.
 */
export function createOpenRouterClient(apiKey?: string): OpenAI {
  const key = apiKey ?? config.openRouterApiKey;

  if (!key) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY is not set. ' +
        'Add it to your .env file or pass it as the OPENROUTER_API_KEY environment variable.',
    );
  }

  return new OpenAI({
    apiKey: key,
    baseURL: config.openRouterBaseUrl,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/release-note-server',
      'X-Title': 'release-note-server',
    },
  });
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResult {
  content: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

/**
 * Sends a chat-completion request via OpenRouter and returns the text response
 * along with usage metadata.
 */
export async function complete(
  messages: ChatMessage[],
  model?: string,
  apiKey?: string,
): Promise<CompletionResult> {
  const client = createOpenRouterClient(apiKey);
  const resolvedModel = model ?? config.openRouterModel;

  let response: OpenAI.Chat.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model: resolvedModel,
      messages,
    });
  } catch (err: unknown) {
    if (err instanceof OpenAI.APIError) {
      throw new OpenRouterError(
        `OpenRouter API error ${err.status}: ${err.message}`,
        err.status,
      );
    }
    throw err;
  }

  const choice = response.choices[0];
  if (!choice?.message?.content) {
    throw new OpenRouterError('OpenRouter returned an empty response.');
  }

  return {
    content: choice.message.content,
    model: response.model ?? resolvedModel,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  };
}
