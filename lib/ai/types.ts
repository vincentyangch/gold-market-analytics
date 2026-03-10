export interface AiProvider {
  generateCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
}
