<script>
	import { onMount } from 'svelte';

	/** @type {{ title: string, description: string, link: string }[]} */
	let news = $state([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/util/whatsapp-news');
			const json = await res.json();
			news = json.data || [];
		} catch (e) {
			console.error('Failed to fetch news:', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Updates | Whatsaly</title>
</svelte:head>

<section class="fade-in">
	<div class="card max-w-2xl mx-auto">
		<div class="card-header flex items-center gap-2">
			<i class="fi fi-rr-bell text-sm" style="color: hsl(var(--primary));"></i>
			<span>WhatsApp Updates</span>
		</div>
		<div>
			{#if loading}
				<div class="p-6 space-y-3">
					<div class="shimmer h-5 w-2/3 rounded"></div>
					<div class="shimmer h-4 w-full rounded"></div>
					<div class="shimmer h-4 w-3/4 rounded"></div>
				</div>
			{:else if news.length === 0}
				<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
					<i class="fi fi-rr-signal-slash text-2xl mb-2 block opacity-40"></i>
					<p class="text-sm">No updates available</p>
				</div>
			{:else}
				{#each news as item}
					<a href={item.link} target="_blank" rel="noopener noreferrer" class="news-item block">
						<div class="font-medium text-sm mb-1" style="color: hsl(var(--primary));">{item.title}</div>
						<p class="text-xs line-clamp-2" style="color: hsl(var(--text-muted));">{item.description?.trim()}</p>
					</a>
				{/each}
			{/if}
		</div>
	</div>
</section>
