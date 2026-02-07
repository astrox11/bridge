import { writable } from 'svelte/store';

// Admin authentication state
export const isAdminAuthenticated = writable(false);

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

// Check if admin is already authenticated by validating server-side cookie
export async function checkAdminAuth() {
	if (typeof window !== 'undefined') {
		try {
			// First check local session storage for quick UI response
			const localAuth = sessionStorage.getItem('adminAuth');
			if (localAuth === 'true') {
				isAdminAuthenticated.set(true);
			}
			
			// Validate with server to ensure cookie is still valid
			const response = await fetch('/api/auth/admin/validate', {
				method: 'GET',
				credentials: 'include', // Important: include cookies
			});
			
			if (response.ok) {
				const data = await response.json();
				if (data.valid) {
					isAdminAuthenticated.set(true);
					sessionStorage.setItem('adminAuth', 'true');
					return true;
				}
			}
			
			// Server says invalid - clear local state
			isAdminAuthenticated.set(false);
			sessionStorage.removeItem('adminAuth');
			return false;
		} catch (error) {
			// Network error - keep local state if set
			const localAuth = sessionStorage.getItem('adminAuth');
			if (localAuth === 'true') {
				isAdminAuthenticated.set(true);
				return true;
			}
			return false;
		}
	}
	return false;
}

// Logout admin - clear local state (cookie will expire or be cleared by server)
export function logoutAdmin() {
	isAdminAuthenticated.set(false);
	if (typeof window !== 'undefined') {
		sessionStorage.removeItem('adminAuth');
		// Clear admin_session cookie by setting expired date
		document.cookie = 'admin_session=; Path=/; Max-Age=0; SameSite=Strict';
	}
}
