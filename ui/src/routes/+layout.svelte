<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import AdminLogin from '$lib/components/AdminLogin.svelte';
	import { isAdminAuthenticated, checkAdminAuth } from '$lib/stores/admin';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	let mounted = $state(false);
	let checking = $state(true);

	// Admin routes that require authentication
	const adminRoutes = ['/', '/logs', '/news', '/pair'];

	// Check if current route is an admin route
	function isAdminRoute(pathname) {
		return adminRoutes.includes(pathname);
	}

	onMount(async () => {
		await checkAdminAuth();
		checking = false;
		mounted = true;
	});

	// Determine if we should show admin login
	let showAdminLogin = $derived(
		mounted && !checking && isAdminRoute($page.url.pathname) && !$isAdminAuthenticated
	);
</script>

<div class="min-h-screen">
	{#if checking && isAdminRoute($page.url.pathname)}
		<!-- Loading state while checking auth -->
		<div class="flex items-center justify-center min-h-screen">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
		</div>
	{:else if showAdminLogin}
		<AdminLogin />
	{:else}
		{#if mounted && isAdminRoute($page.url.pathname) && $isAdminAuthenticated}
			<Header />
		{/if}
		
		<main class="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">
			{@render children()}
		</main>
	{/if}
</div>
