<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let instances = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let executing = $state(null);
	let showCreateForm = $state(false);
	let newPhoneNumber = $state('');
	let newInstanceName = $state('');
	let creating = $state(false);
	let createError = $state('');

	$effect(() => {
		const hash = $page.params.hash;
		if (hash) {
			fetchInstances(hash);
		}
	});

	async function fetchInstances(hash) {
		try {
			loading = true;
			const res = await fetch(`/api/user/${hash}/instances`);
			const data = await res.json();
			
			if (data.success) {
				instances = data.instances;
			} else {
				error = data.message;
			}
		} catch (e) {
			error = 'Failed to load instances';
		} finally {
			loading = false;
		}
	}

	async function createInstance() {
		if (!newPhoneNumber.trim()) {
			createError = 'Phone number is required';
			return;
		}

		creating = true;
		createError = '';

		try {
			const res = await fetch(`/api/user/${$page.params.hash}/instances`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber: newPhoneNumber,
					name: newInstanceName || null
				})
			});
			const data = await res.json();
			
			if (data.success) {
				newPhoneNumber = '';
				newInstanceName = '';
				showCreateForm = false;
				await fetchInstances($page.params.hash);
			} else {
				createError = data.message;
			}
		} catch (e) {
			createError = 'Failed to create instance';
		} finally {
			creating = false;
		}
	}

	async function executeAction(sessionId, action) {
		executing = `${sessionId}-${action}`;
		try {
			const res = await fetch(`/api/user/${$page.params.hash}/tools/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					toolId: action,
					sessionId: sessionId
				})
			});
			const data = await res.json();
			
			if (data.success) {
				// Refresh instances
				await fetchInstances($page.params.hash);
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Action failed');
		} finally {
			executing = null;
		}
	}

	function getStatusColor(status) {
		switch (status) {
			case 'connected':
			case 'active':
				return 'var(--primary)';
			case 'paused':
				return 'var(--warning, 45 93% 47%)';
			default:
				return 'var(--danger)';
		}
	}
</script>

<svelte:head>
	<title>My Instances | Whatsaly</title>
</svelte:head>

<section class="space-y-6 fade-in">
	<div class="flex justify-between items-center">
		<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">My Instances</h1>
		<button class="btn btn-primary" onclick={() => showCreateForm = !showCreateForm}>
			<i class="fi {showCreateForm ? 'fi-rr-cross' : 'fi-rr-plus'}"></i>
			{showCreateForm ? 'Cancel' : 'New Instance'}
		</button>
	</div>

	<!-- Create Instance Form -->
	{#if showCreateForm}
		<div class="card fade-in">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-add text-sm" style="color: hsl(var(--primary));"></i>
				<span>Create New Instance</span>
			</div>
			<div class="p-4 space-y-4">
				{#if createError}
					<div class="p-3 rounded-lg text-sm" 
						style="background: hsla(var(--danger) / 0.1); color: hsl(var(--danger));">
						<i class="fi fi-rr-exclamation mr-2"></i>
						{createError}
					</div>
				{/if}
				<div class="text-sm p-3 rounded-lg" style="background: hsla(var(--primary) / 0.1); color: hsl(var(--text-muted));">
					<i class="fi fi-rr-info mr-2" style="color: hsl(var(--primary));"></i>
					<strong>Note:</strong> You can only have one instance per phone number. Enter the phone number associated with your WhatsApp account.
				</div>
				<div>
					<label for="new-phone" class="label">Phone Number</label>
					<input 
						id="new-phone"
						type="tel" 
						bind:value={newPhoneNumber}
						class="input"
						placeholder="+1234567890"
					/>
				</div>
				<div>
					<label for="new-name" class="label">Instance Name (optional)</label>
					<input 
						id="new-name"
						type="text" 
						bind:value={newInstanceName}
						class="input"
						placeholder="My WhatsApp"
					/>
				</div>
				<div class="flex justify-end gap-2">
					<button class="btn btn-secondary" onclick={() => showCreateForm = false}>
						Cancel
					</button>
					<button 
						class="btn btn-primary"
						onclick={createInstance}
						disabled={creating || !newPhoneNumber.trim()}>
						{#if creating}
							<i class="fi fi-rr-spinner animate-spin"></i>
						{:else}
							<i class="fi fi-rr-check"></i>
						{/if}
						Create Instance
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="card">
			{#each [1, 2] as _}
				<div class="p-4 border-b" style="border-color: hsl(var(--border));">
					<div class="flex items-center gap-4">
						<div class="shimmer w-12 h-12 rounded-full"></div>
						<div class="flex-1">
							<div class="shimmer h-4 w-32 rounded mb-2"></div>
							<div class="shimmer h-3 w-24 rounded"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="card p-8 text-center">
			<i class="fi fi-rr-exclamation text-3xl mb-4" style="color: hsl(var(--danger));"></i>
			<p style="color: hsl(var(--text-muted));">{error}</p>
		</div>
	{:else if instances.length === 0}
		<div class="card p-12 text-center">
			<i class="fi fi-rr-server text-4xl mb-4 opacity-40" style="color: hsl(var(--text-muted));"></i>
			<h3 class="font-medium mb-2" style="color: hsl(var(--text));">No instances yet</h3>
			<p class="text-sm mb-6" style="color: hsl(var(--text-muted));">Create your first WhatsApp instance to get started</p>
			<button class="btn btn-primary inline-flex" onclick={() => showCreateForm = true}>
				<i class="fi fi-rr-plus"></i>
				Create Instance
			</button>
		</div>
	{:else}
		<div class="card">
			{#each instances as instance}
				<div class="instance-item">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-full flex items-center justify-center"
							style="background: hsla({getStatusColor(instance.status)} / 0.1);">
							<i class="fi fi-rr-smartphone text-lg" style="color: hsl({getStatusColor(instance.status)});"></i>
						</div>
						<div class="flex-1">
							<div class="font-medium" style="color: hsl(var(--text));">
								{instance.name || instance.sessionId}
							</div>
							<div class="text-sm flex items-center gap-2" style="color: hsl(var(--text-muted));">
								<span class="status-dot" style="background: hsl({getStatusColor(instance.status)});"></span>
								<span class="capitalize">{instance.status}</span>
								<span>•</span>
								<span class="mono">{instance.sessionId}</span>
							</div>
						</div>
					</div>
					
					<div class="flex items-center gap-2 mt-4 sm:mt-0">
						{#if instance.status === 'paused'}
							<button 
								class="action-btn action-btn-success"
								onclick={() => executeAction(instance.sessionId, 'resume')}
								disabled={executing === `${instance.sessionId}-resume`}>
								{#if executing === `${instance.sessionId}-resume`}
									<i class="fi fi-rr-spinner animate-spin"></i>
								{:else}
									<i class="fi fi-rr-play"></i>
								{/if}
								Resume
							</button>
						{:else}
							<button 
								class="action-btn action-btn-warning"
								onclick={() => executeAction(instance.sessionId, 'pause')}
								disabled={executing === `${instance.sessionId}-pause`}>
								{#if executing === `${instance.sessionId}-pause`}
									<i class="fi fi-rr-spinner animate-spin"></i>
								{:else}
									<i class="fi fi-rr-pause"></i>
								{/if}
								Pause
							</button>
						{/if}
						<button 
							class="action-btn"
							onclick={() => executeAction(instance.sessionId, 'restart')}
							disabled={executing === `${instance.sessionId}-restart`}>
							{#if executing === `${instance.sessionId}-restart`}
								<i class="fi fi-rr-spinner animate-spin"></i>
							{:else}
								<i class="fi fi-rr-refresh"></i>
							{/if}
							Restart
						</button>
						<button 
							class="action-btn"
							onclick={() => executeAction(instance.sessionId, 'check-status')}
							disabled={executing === `${instance.sessionId}-check-status`}>
							{#if executing === `${instance.sessionId}-check-status`}
								<i class="fi fi-rr-spinner animate-spin"></i>
							{:else}
								<i class="fi fi-rr-eye"></i>
							{/if}
							Status
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.instance-item {
		@apply p-4 border-b last:border-0 flex flex-col sm:flex-row sm:items-center sm:justify-between;
		border-color: hsl(var(--border));
	}

	.instance-item:hover {
		background: hsla(var(--text) / 0.02);
	}

	.action-btn {
		@apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors;
		background: hsl(var(--bg));
		color: hsl(var(--text-muted));
		border: 1px solid hsl(var(--border));
	}

	.action-btn:hover:not(:disabled) {
		background: hsla(var(--text) / 0.05);
		color: hsl(var(--text));
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn-success {
		background: hsla(var(--primary) / 0.1);
		color: hsl(var(--primary));
		border-color: hsl(var(--primary));
	}

	.action-btn-warning {
		background: hsla(45 93% 47% / 0.1);
		color: hsl(45 93% 47%);
		border-color: hsl(45 93% 47%);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
