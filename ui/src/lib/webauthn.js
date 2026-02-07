/**
 * WebAuthn utility functions for encoding/decoding and passkey operations
 */

/**
 * Convert a base64url string to an ArrayBuffer
 */
export function base64UrlToArrayBuffer(base64url) {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(base64 + padding);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Convert an ArrayBuffer to a base64url string
 */
export function arrayBufferToBase64Url(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Check if WebAuthn passkey is supported on this device
 */
export async function isPasskeySupported() {
	if (typeof window === 'undefined' || !window.PublicKeyCredential) {
		return false;
	}
	try {
		return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
	} catch {
		return false;
	}
}

/**
 * Get a human-readable device name for the passkey
 */
export function getDeviceName() {
	const ua = navigator.userAgent;
	if (ua.includes('iPhone')) return 'iPhone';
	if (ua.includes('iPad')) return 'iPad';
	if (ua.includes('Android')) return 'Android Device';
	if (ua.includes('Mac')) return 'Mac';
	if (ua.includes('Windows')) return 'Windows PC';
	if (ua.includes('Linux')) return 'Linux';
	return 'Unknown Device';
}
