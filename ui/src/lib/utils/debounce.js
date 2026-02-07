/**
 * Debounce utility - prevents excessive function calls
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle utility - limits function execution rate
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 100) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Request cache - prevents duplicate API calls
 */
const cache = new Map();

/**
 * Cached fetch - caches responses for a specified duration
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} ttl - Cache TTL in milliseconds (default: 30 seconds)
 * @returns {Promise} Fetch response
 */
export async function cachedFetch(url, options = {}, ttl = 30000) {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  
  // Cleanup old cache entries
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  return data;
}

/**
 * Clear the request cache
 */
export function clearCache() {
  cache.clear();
}
