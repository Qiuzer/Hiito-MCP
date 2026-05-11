export function logError(context: string, error: any) {
  console.error(`[${context}] ${error?.message || error}`);
  if (error?.stack) console.error(error.stack);
}

export function truncateResponse(text: string, limit: number = 25000): string {
  if (text.length <= limit) return text;
  return text.substring(0, limit) + "... [Truncated]";
}
