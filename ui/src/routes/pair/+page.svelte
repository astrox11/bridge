<script>
	import PairingModal from '$lib/components/PairingModal.svelte';

	let modalOpen = $state(false);
</script>

<svelte:head>
	<title>Link Device | Whatsaly</title>
</svelte:head>

<section class="fade-in">
	<div class="card max-w-sm mx-auto p-8 text-center">
		<div class="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5" style="background: hsla(var(--primary) / 0.1);">
			<i class="fi fi-rr-smartphone text-xl" style="color: hsl(var(--primary));"></i>
		</div>
		<h2 class="text-lg font-semibold mb-2" style="color: hsl(var(--text));">Connect Device</h2>
		<p class="text-sm mb-6" style="color: hsl(var(--text-muted));">
			Generate an 8-digit code to link your phone.
		</p>
		<button onclick={() => modalOpen = true} class="btn btn-primary w-full">
			<i class="fi fi-rr-link-alt"></i>
			Start Connection
		</button>
	</div>
</section>

<PairingModal bind:open={modalOpen} />
