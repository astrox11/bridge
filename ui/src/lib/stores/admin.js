import { writable } from 'svelte/store';

// Admin authentication state
export const isAdminAuthenticated = writable(false);

// Current view for SPA-style navigation (admin can switch between views without URL change)
export const adminCurrentView = writable('dashboard'); // 'dashboard' | 'logs' | 'news' | 'pair' | 'user-portal'

// Store admin session in browser
export function setAdminAuthenticated(value) {
	isAdminAuthenticated.set(value);
	if (typeof window !== 'undefined') {
		if (value) {
			sessionStorage.setItem('adminAuth', 'true');
		} else {
			sessionStorage.removeItem('adminAuth');
		}
	}
}

// Check if admin is already authenticated (from session storage)
export function checkAdminAuth() {
	if (typeof window !== 'undefined') {
		const auth = sessionStorage.getItem('adminAuth');
		if (auth === 'true') {
			isAdminAuthenticated.set(true);
			return true;
		}
	}
	return false;
}

// Logout admin
export function logoutAdmin() {
	isAdminAuthenticated.set(false);
	adminCurrentView.set('dashboard');
	if (typeof window !== 'undefined') {
		sessionStorage.removeItem('adminAuth');
	}
}
