<script>
	import { page } from '$app/stores';
	import ThemeToggle from './ThemeToggle.svelte';
	
	const navItems = [
		{ href: '/', label: 'Dashboard', mobileLabel: 'Overview', icon: 'fi-rr-apps' },
		{ href: '/news', label: 'Updates', mobileLabel: 'Updates', icon: 'fi-rr-bell' },
		{ href: '/pair', label: 'Link', mobileLabel: 'Connect', icon: 'fi-rr-add' }
	];
</script>

<header class="header">
	<div class="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
		<div class="flex items-center gap-3">
			<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: hsl(var(--primary));">
				<i class="fi fi-rr-cloud-share text-white text-sm"></i>
			</div>
			<span class="font-semibold" style="color: hsl(var(--text));">Whatsaly</span>
		</div>

		<nav class="hidden md:flex gap-1">
			{#each navItems as item}
				<a href={item.href} class="nav-link" class:active={$page.url.pathname === item.href}>
					<i class="fi {item.icon}"></i>
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-3">
			<div class="hidden sm:flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-full" style="background: hsla(var(--primary) / 0.1); color: hsl(var(--primary));">
				<span class="status-dot status-online"></span>
				Active
			</div>
			<ThemeToggle />
		</div>
	</div>
</header>

<nav class="md:hidden mobile-nav">
	{#each navItems as item}
		<a href={item.href} class="nav-link" class:active={$page.url.pathname === item.href}>
			<i class="fi {item.icon}"></i>
			<span>{item.mobileLabel}</span>
		</a>
	{/each}
</nav>
