<script>
	import { page } from '$app/stores';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let cryptoHash = $derived($page.params.hash || '');

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();
</script>

{#snippet navItems()}
	{@const items = [
		{ href: `/user/${cryptoHash}`, label: 'Dashboard', icon: 'fi-rr-apps' },
		{ href: `/user/${cryptoHash}/instances`, label: 'Instances', icon: 'fi-rr-server' },
		{ href: `/user/${cryptoHash}/billing`, label: 'Billing', icon: 'fi-rr-credit-card' },
		{ href: `/user/${cryptoHash}/support`, label: 'Support', icon: 'fi-rr-headset' },
		{ href: `/user/${cryptoHash}/tools`, label: 'Tools', icon: 'fi-rr-tools' }
	]}
	{#each items as item}
		<a href={item.href} class="nav-link" class:active={$page.url.pathname === item.href}>
			<i class="fi {item.icon}"></i>
			{item.label}
		</a>
	{/each}
{/snippet}

{#snippet mobileNavItems()}
	{@const items = [
		{ href: `/user/${cryptoHash}`, label: 'Dash', icon: 'fi-rr-apps' },
		{ href: `/user/${cryptoHash}/instances`, label: 'Inst', icon: 'fi-rr-server' },
		{ href: `/user/${cryptoHash}/billing`, label: 'Bill', icon: 'fi-rr-credit-card' },
		{ href: `/user/${cryptoHash}/support`, label: 'Help', icon: 'fi-rr-headset' },
		{ href: `/user/${cryptoHash}/tools`, label: 'Tools', icon: 'fi-rr-tools' }
	]}
	{#each items as item}
		<a href={item.href} class="nav-link" class:active={$page.url.pathname === item.href}>
			<i class="fi {item.icon}"></i>
			<span class="text-[10px]">{item.label}</span>
		</a>
	{/each}
{/snippet}

<div class="min-h-screen">
	<header class="header">
		<div class="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
			<div class="flex items-center gap-3">
				<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: hsl(var(--primary));">
					<i class="fi fi-rr-user text-white text-sm"></i>
				</div>
				<span class="font-semibold" style="color: hsl(var(--text));">My Dashboard</span>
			</div>

			<nav class="hidden md:flex gap-1">
				{@render navItems()}
			</nav>

			<div class="flex items-center gap-3">
				<a href="/login" class="text-xs font-medium px-3 py-1.5 rounded-lg" style="background: hsla(var(--text) / 0.1); color: hsl(var(--text));">
					Logout
				</a>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<nav class="md:hidden mobile-nav">
		{@render mobileNavItems()}
	</nav>
	
	<main class="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">
		{@render children()}
	</main>
</div>
