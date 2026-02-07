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

	// Admin routes that require authentication
	const adminRoutes = ['/', '/logs', '/news', '/pair'];

	// Check if current route is an admin route
	function isAdminRoute(pathname) {
		return adminRoutes.includes(pathname);
	}

	onMount(() => {
		checkAdminAuth();
		mounted = true;
	});

	// Determine if we should show admin login
	let showAdminLogin = $derived(
		mounted && isAdminRoute($page.url.pathname) && !$isAdminAuthenticated
	);
</script>

<div class="min-h-screen">
	{#if showAdminLogin}
		<AdminLogin />
	{:else}
		{#if mounted && isAdminRoute($page.url.pathname) && $isAdminAuthenticated}
			<Header />
		{:else if !isAdminRoute($page.url.pathname)}
			<!-- Non-admin routes don't need header (they have their own layouts) -->
		{:else}
			<Header />
		{/if}
		
		<main class="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">
			{@render children()}
		</main>
	{/if}
</div>
