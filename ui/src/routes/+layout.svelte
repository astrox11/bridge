<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();
</script>

<div class="min-h-screen">
	<Header />
	
	<main class="max-w-5xl mx-auto px-4 pt-20 pb-24 md:pb-8">
		{@render children()}
	</main>
</div>
