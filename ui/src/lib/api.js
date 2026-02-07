/**
 * Security API utilities for handling obfuscated responses
 * Response format: { c: code, s: status (0/1), d: base64Data, t: timestamp, sig: signature, tk?: tokens }
 */

// Response code mappings (client-side reference)
export const ResponseCodes = {
	AUTH_SUCCESS: 0x1A3F,
	AUTH_FAILED: 0x2B4E,
	TOKEN_VALID: 0x3C5D,
	TOKEN_INVALID: 0x4D6C,
	TOKEN_EXPIRED: 0x5E7B,
	ACCESS_DENIED: 0x6F8A,
	ORIGIN_BLOCKED: 0x7099,
	RATE_LIMITED: 0x81A8,
	INVALID_REQUEST: 0x92B7,
	USER_CREATED: 0xA3C6,
	USER_EXISTS: 0xB4D5,
	VALIDATION_ERROR: 0xC5E4,
	INTERNAL_ERROR: 0xD6F3,
	SESSION_CREATED: 0xE702,
	OPERATION_OK: 0xF811,
	PASSKEY_OK: 0x0920
};

/**
 * Parse a secure API response
 * @param {Object} response - The secure response object
 * @returns {Object} Parsed response with success, data, tokens, and error info
 */
export function parseSecureResponse(response) {
	const isSuccess = response.s === 1;
	
	// Decode base64 data if present
	let userData = null;
	if (response.d) {
		try {
			const decoded = atob(response.d);
			userData = JSON.parse(decoded);
		} catch (e) {
			console.error('Failed to decode response data');
		}
	}
	
	// Extract tokens if present
	const tokens = response.tk ? {
		accessToken: response.tk.a,
		refreshToken: response.tk.r,
		expiresIn: response.tk.e
	} : null;
	
	// Map code to error message (for internal use only)
	let errorHint = '';
	switch (response.c) {
		case ResponseCodes.AUTH_FAILED:
			errorHint = 'Authentication failed';
			break;
		case ResponseCodes.TOKEN_INVALID:
			errorHint = 'Session invalid';
			break;
		case ResponseCodes.TOKEN_EXPIRED:
			errorHint = 'Session expired';
			break;
		case ResponseCodes.ACCESS_DENIED:
			errorHint = 'Access denied';
			break;
		case ResponseCodes.VALIDATION_ERROR:
			errorHint = 'Validation error';
			break;
		case ResponseCodes.USER_EXISTS:
			errorHint = 'Account exists';
			break;
		case ResponseCodes.INTERNAL_ERROR:
			errorHint = 'System error';
			break;
		default:
			errorHint = isSuccess ? '' : 'Unknown error';
	}
	
	return {
		success: isSuccess,
		code: response.c,
		data: userData,
		tokens,
		timestamp: response.t,
		error: isSuccess ? null : errorHint
	};
}

/**
 * Store tokens securely (the cookie is already set by the server)
 * This stores additional info client-side
 * @param {Object} tokens - Token object from parseSecureResponse
 */
export function storeAuthTokens(tokens) {
	if (!tokens) return;
	
	// Store refresh token in sessionStorage (not localStorage for security)
	if (tokens.refreshToken) {
		sessionStorage.setItem('wly_rt', tokens.refreshToken);
	}
	
	// Store token expiry
	if (tokens.expiresIn) {
		const expiry = Date.now() + (tokens.expiresIn * 1000);
		sessionStorage.setItem('wly_exp', expiry.toString());
	}
}

/**
 * Clear auth tokens
 */
export function clearAuthTokens() {
	sessionStorage.removeItem('wly_rt');
	sessionStorage.removeItem('wly_exp');
}

/**
 * Check if tokens are likely expired
 * @returns {boolean} True if tokens are expired or not present
 */
export function isTokenExpired() {
	const expiry = sessionStorage.getItem('wly_exp');
	if (!expiry) return true;
	return Date.now() > parseInt(expiry, 10);
}

/**
 * Get the stored refresh token
 * @returns {string|null} The refresh token or null
 */
export function getRefreshToken() {
	return sessionStorage.getItem('wly_rt');
}

/**
 * Make an authenticated API request
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed response
 */
export async function secureRequest(url, options = {}) {
	const defaultHeaders = {
		'Content-Type': 'application/json'
	};
	
	const response = await fetch(url, {
		...options,
		headers: {
			...defaultHeaders,
			...options.headers
		},
		credentials: 'include' // Include cookies
	});
	
	const data = await response.json();
	return parseSecureResponse(data);
}
