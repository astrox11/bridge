<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let tools = $state([]);
	let quickActions = $state([]);
	let instances = $state([]);
	let loading = $state(true);
	let selectedInstance = $state('');
	let executing = $state(null);
	let result = $state(null);

	onMount(async () => {
		await Promise.all([
			fetchTools(),
			fetchQuickActions(),
			fetchInstances()
		]);
		loading = false;
	});

	async function fetchTools() {
		try {
			const res = await fetch('/api/tools');
			const data = await res.json();
			if (data.success) {
				tools = data.tools;
			}
		} catch (e) {
			console.error('Failed to fetch tools:', e);
		}
	}

	async function fetchQuickActions() {
		try {
			const res = await fetch('/api/tools/quick-actions');
			const data = await res.json();
			if (data.success) {
				quickActions = data.actions;
			}
		} catch (e) {
			console.error('Failed to fetch quick actions:', e);
		}
	}

	async function fetchInstances() {
		try {
			const res = await fetch(`/api/user/${$page.params.hash}/instances`);
			const data = await res.json();
			if (data.success) {
				instances = data.instances;
				if (instances.length > 0) {
					selectedInstance = instances[0].sessionId;
				}
			}
		} catch (e) {
			console.error('Failed to fetch instances:', e);
		}
	}

	async function executeTool(toolId) {
		if (!selectedInstance) {
			alert('Please select an instance first');
			return;
		}

		executing = toolId;
		result = null;

		try {
			const res = await fetch(`/api/user/${$page.params.hash}/tools/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					toolId,
					sessionId: selectedInstance
				})
			});
			const data = await res.json();
			result = data;
		} catch (e) {
			result = { success: false, message: 'Execution failed' };
		} finally {
			executing = null;
		}
	}

	function getIconClass(iconName) {
		const iconMap = {
			'refresh': 'fi-rr-refresh',
			'pause': 'fi-rr-pause',
			'play': 'fi-rr-play',
			'trash': 'fi-rr-trash',
			'users': 'fi-rr-users',
			'download': 'fi-rr-download',
			'activity': 'fi-rr-signal-alt-2',
			'link': 'fi-rr-link-alt',
			'refresh-cw': 'fi-rr-refresh'
		};
		return iconMap[iconName] || 'fi-rr-apps';
	}

	function getColorClass(color) {
		const colorMap = {
			'blue': 'hsla(210 100% 50% / 0.1)',
			'yellow': 'hsla(45 93% 47% / 0.1)',
			'green': 'hsla(var(--primary) / 0.1)',
			'gray': 'hsla(var(--text) / 0.1)'
		};
		return colorMap[color] || 'hsla(var(--primary) / 0.1)';
	}

	const toolsByCategory = $derived(() => {
		const grouped = {};
		for (const tool of tools) {
			if (!grouped[tool.category]) {
				grouped[tool.category] = [];
			}
			grouped[tool.category].push(tool);
		}
		return grouped;
	});
</script>

<svelte:head>
	<title>Tools | Whatsaly</title>
</svelte:head>

<section class="space-y-6 fade-in">
	<div class="flex justify-between items-center">
		<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">Command Tools</h1>
	</div>

	<!-- Instance Selector -->
	<div class="card">
		<div class="card-header flex items-center gap-2">
			<i class="fi fi-rr-server text-sm" style="color: hsl(var(--primary));"></i>
			<span>Select Instance</span>
		</div>
		<div class="p-4">
			{#if instances.length === 0}
				<p class="text-sm" style="color: hsl(var(--text-muted));">No instances available</p>
			{:else}
				<select bind:value={selectedInstance} class="input">
					{#each instances as instance}
						<option value={instance.sessionId}>
							{instance.name || instance.sessionId} ({instance.status})
						</option>
					{/each}
				</select>
			{/if}
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="card">
		<div class="card-header flex items-center gap-2">
			<i class="fi fi-rr-bolt text-sm" style="color: hsl(var(--primary));"></i>
			<span>Quick Actions</span>
		</div>
		<div class="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
			{#each quickActions as action}
				<button 
					class="quick-action-btn"
					style="--action-bg: {getColorClass(action.color)};"
					onclick={() => executeTool(action.id)}
					disabled={executing || !selectedInstance}>
					{#if executing === action.id}
						<i class="fi fi-rr-spinner animate-spin"></i>
					{:else}
						<i class="fi {getIconClass(action.icon)}"></i>
					{/if}
					<span>{action.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Result Display -->
	{#if result}
		<div class="card fade-in">
			<div class="card-header flex items-center gap-2" 
				style="background: hsla({result.success ? 'var(--primary)' : 'var(--danger)'} / 0.1);">
				<i class="fi {result.success ? 'fi-rr-check' : 'fi-rr-cross'}" 
					style="color: hsl({result.success ? 'var(--primary)' : 'var(--danger)'});"></i>
				<span style="color: hsl({result.success ? 'var(--primary)' : 'var(--danger)'});">
					{result.success ? 'Success' : 'Error'}
				</span>
			</div>
			<div class="p-4">
				<p class="text-sm" style="color: hsl(var(--text));">{result.message}</p>
				{#if result.data}
					<pre class="mt-4 p-4 rounded-lg text-xs overflow-auto" style="background: hsl(var(--bg)); color: hsl(var(--text-muted));">{JSON.stringify(result.data, null, 2)}</pre>
				{/if}
			</div>
		</div>
	{/if}

	<!-- All Tools -->
	{#each Object.entries(toolsByCategory()) as [category, categoryTools]}
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-apps text-sm" style="color: hsl(var(--primary));"></i>
				<span class="capitalize">{category} Tools</span>
			</div>
			<div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
				{#each categoryTools as tool}
					<button 
						class="tool-btn"
						onclick={() => executeTool(tool.id)}
						disabled={executing || !selectedInstance}>
						<div class="tool-icon">
							{#if executing === tool.id}
								<i class="fi fi-rr-spinner animate-spin"></i>
							{:else}
								<i class="fi {getIconClass(tool.icon)}"></i>
							{/if}
						</div>
						<div class="text-left">
							<div class="font-medium text-sm" style="color: hsl(var(--text));">{tool.name}</div>
							<div class="text-xs" style="color: hsl(var(--text-muted));">{tool.description}</div>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/each}
</section>

<style>
	.quick-action-btn {
		@apply flex flex-col items-center justify-center gap-2 p-4 rounded-lg text-sm font-medium transition-all;
		background: var(--action-bg);
		color: hsl(var(--text));
		border: 1px solid transparent;
	}

	.quick-action-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px hsla(var(--text) / 0.1);
	}

	.quick-action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quick-action-btn i {
		font-size: 1.25rem;
	}

	.tool-btn {
		@apply flex items-center gap-3 p-4 rounded-lg transition-all;
		background: hsl(var(--bg));
		border: 1px solid hsl(var(--border));
	}

	.tool-btn:hover:not(:disabled) {
		border-color: hsl(var(--primary));
		background: hsla(var(--primary) / 0.05);
	}

	.tool-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.tool-icon {
		@apply w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0;
		background: hsla(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
