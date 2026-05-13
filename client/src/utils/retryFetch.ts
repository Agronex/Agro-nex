/**
 * Fetch with retry logic and exponential backoff
 * Automatically retries failed requests with increasing delay between attempts
 * Does not retry authentication errors (401, 403)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      
      // Don't retry auth errors
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed');
      }
      
      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      if (i < maxRetries - 1) {
        const backoff = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry
      const backoff = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  
  throw new Error('Max retries exceeded');
}
