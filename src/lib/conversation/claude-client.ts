import Anthropic from '@anthropic-ai/sdk';

/**
 * サーバー側専用の Claude API クライアント。
 * APIキーは環境変数 AI_API_KEY からのみ読み込み、ブラウザには公開しない
 * （このファイルは API ルート / サーバー専用モジュールからのみ import すること）。
 */

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.AI_API_KEY,
      // 子ども向けチャットは短い応答なので、待たせすぎないタイムアウトにする
      timeout: 12_000,
      maxRetries: 2,
    });
  }
  return client;
}

export function getClaudeModel(): string {
  return process.env.AI_MODEL || 'claude-sonnet-5';
}
