<script>
	/** @type {{ id: string, name: string, status: string }[]} */
	export let sessions = [];

	/** @type {boolean} */
	export let loading = true;

	/**
	 * @param {string} phone
	 * @param {string} action
	 */
	async function handleAction(phone, action) {
		try {
			await fetch(`/api/instances/${phone}/${action}`, { method: 'POST' });
		} catch (e) {
			console.error('Session action failed:', e);
		}
	}
</script>

<div class="card">
	<div class="card-header flex justify-between items-center">
		<div class="flex items-center gap-2">
			<i class="fi fi-rr-signal-alt-2 text-sm" style="color: hsl(var(--primary));"></i>
			<span>Instances</span>
		</div>
		{#if !loading && sessions.length > 0}
			<span class="text-xs px-2 py-0.5 rounded-full" style="background: hsla(var(--primary) / 0.1); color: hsl(var(--primary));">
				{sessions.length} active
			</span>
		{/if}
	</div>
	<div>
		{#if loading}
			<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
				<div class="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-2" style="border-color: hsl(var(--border)); border-top-color: hsl(var(--primary));"></div>
				<p class="text-sm">Loading...</p>
			</div>
		{:else if sessions.length === 0}
			<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
				<i class="fi fi-rr-smartphone text-2xl mb-2 block opacity-40"></i>
				<p class="text-sm">No active sessions</p>
			</div>
		{:else}
			{#each sessions as session}
				<div class="session-item">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background: hsl(var(--bg)); border: 1px solid hsl(var(--border));">
							<i class="fi fi-rr-smartphone" style="color: hsl(var(--text-muted));"></i>
						</div>
						<div>
							<div class="font-medium text-sm" style="color: hsl(var(--text));">{session.name}</div>
							<div class="flex items-center gap-1.5 mt-0.5">
								<span class="status-dot" class:status-online={session.status === 'connected'} class:status-offline={session.status !== 'connected'}></span>
								<span class="text-xs" style="color: hsl(var(--text-muted));">{session.status}</span>
							</div>
						</div>
					</div>
					<div class="flex gap-2">
						<button onclick={() => handleAction(session.id, session.status === 'paused' ? 'resume' : 'pause')} class="btn btn-secondary py-2 px-3">
							<i class="fi fi-rr-{session.status === 'paused' ? 'play' : 'pause'}"></i>
						</button>
						<button onclick={() => handleAction(session.id, 'reset')} class="btn btn-secondary py-2 px-3" style="color: hsl(var(--danger));">
							<i class="fi fi-rr-trash"></i>
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
