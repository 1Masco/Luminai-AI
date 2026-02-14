/**
 * Debounce utility - delays function execution until after specified wait period has elapsed
 * Useful for search inputs, auto-save, etc.
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility - limits function execution to once per specified time period
 * Useful for scroll events, resize events, rapid clicks
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastRun: number = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastRun < limit) {
      inThrottle = true;
    } else {
      func(...args);
      lastRun = now;
      inThrottle = false;
    }
  };
}

/**
 * Rate limit utility - only allows function to execute at most once per time period
 * Similar to throttle but uses a callback for async operations
 * @param func - Async function to rate limit
 * @param limit - Time limit in milliseconds
 * @returns Rate-limited async function
 */
export function rateLimit<T extends (...args: any[]) => Promise<any>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => Promise<any> {
  let lastCall: number = 0;
  let pending: Promise<any> | null = null;

  return async function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall < limit) {
      // Still in cooldown, return pending promise if exists
      if (pending) {
        return pending;
      }
      // Otherwise wait and try again
      await new Promise(resolve => setTimeout(resolve, limit - timeSinceLastCall));
    }

    lastCall = Date.now();
    pending = func(...args);
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}

/**
 * Retry utility - retries a function with exponential backoff
 * @param func - Async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelay - Initial delay in milliseconds (default: 1000)
 * @returns Function that retries on failure
 */
export async function withRetry<T>(
  func: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await func();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff: delay increases with each retry
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Create a debounced version of an async function
 * @param asyncFunc - Async function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  asyncFunc: T,
  wait: number
): (...args: Parameters<T>) => Promise<any> {
  let timeout: NodeJS.Timeout;
  let pendingPromise: Promise<any> | null = null;

  return function executedFunction(...args: Parameters<T>): Promise<any> {
    return new Promise((resolve, reject) => {
      const later = async () => {
        try {
          const result = await asyncFunc(...args);
          resolve(result);
          pendingPromise = null;
        } catch (error) {
          reject(error);
          pendingPromise = null;
        }
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (pendingPromise) {
        pendingPromise.then(resolve).catch(reject);
      }
    });
  };
}
