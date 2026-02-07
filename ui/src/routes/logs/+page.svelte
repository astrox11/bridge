<script>
	let logs = $state([]);
	let autoScroll = $state(true);
	let connectionStatus = $state('connecting');
	let logContainer;

	$effect(() => {
		const eventSource = new EventSource('/api/logs/stream');
		
		eventSource.onopen = () => {
			connectionStatus = 'connected';
		};
		
		eventSource.onmessage = (event) => {
			// Ignore empty keep-alive pings
			if (!event.data || event.data.trim() === '') return;
			
			const [level, tag, ...messageParts] = event.data.split('|');
			const message = messageParts.join('|'); // In case message contains |
			if (!level || !tag) return; // Invalid format
			
			logs = [...logs, { level, tag, message, time: new Date().toLocaleTimeString() }].slice(-500);
			
			if (autoScroll && logContainer) {
				requestAnimationFrame(() => {
					logContainer.scrollTop = logContainer.scrollHeight;
				});
			}
		};
		
		eventSource.onerror = () => {
			connectionStatus = 'disconnected';
		};

		return () => eventSource.close();
	});

	const getLevelColor = (level) => {
		switch (level) {
			case 'ERROR': return 'var(--error)';
			case 'WARN': return 'var(--warning)';
			case 'SUCCESS': return 'var(--success)';
			case 'DEBUG': return 'var(--muted)';
			default: return 'var(--primary)';
		}
	};

	const clearLogs = () => {
		logs = [];
	};
</script>

<svelte:head>
	<title>Logs - Whatsaly</title>
</svelte:head>

<div class="logs-page">
	<div class="logs-header">
		<div>
			<h1>Logs</h1>
			<p class="subtitle">
				{logs.length} entries • 
				<span class="status" class:connected={connectionStatus === 'connected'} class:disconnected={connectionStatus === 'disconnected'}>
					{connectionStatus}
				</span>
			</p>
		</div>
		<div class="controls">
			<label class="toggle">
				<input type="checkbox" bind:checked={autoScroll} />
				<span>Auto-scroll</span>
			</label>
			<button class="btn-clear" onclick={clearLogs}>Clear</button>
		</div>
	</div>

	<div class="logs-container" bind:this={logContainer}>
		{#if logs.length === 0}
			<div class="empty-state">
				<i class="fi fi-rr-document"></i>
				<p>Waiting for logs...</p>
			</div>
		{:else}
			{#each logs as log}
				<div class="log-entry">
					<span class="time">{log.time}</span>
					<span class="level" style="color: {getLevelColor(log.level)}">[{log.level}]</span>
					<span class="tag">[{log.tag}]</span>
					<span class="message">{log.message}</span>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.logs-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 8rem);
	}

	.logs-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.logs-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(var(--text));
		margin: 0;
	}

	.subtitle {
		font-size: 0.875rem;
		color: hsl(var(--muted));
		margin: 0.25rem 0 0;
	}

	.status.connected {
		color: hsl(var(--success, 142 76% 36%));
	}

	.status.disconnected {
		color: hsl(var(--error, 0 84% 60%));
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: hsl(var(--text));
		cursor: pointer;
	}

	.toggle input {
		accent-color: hsl(var(--primary));
	}

	.btn-clear {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		background: hsla(var(--text) / 0.1);
		color: hsl(var(--text));
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-clear:hover {
		background: hsla(var(--text) / 0.15);
	}

	.logs-container {
		flex: 1;
		overflow-y: auto;
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 0.75rem;
		padding: 1rem;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: hsl(var(--muted));
		gap: 0.5rem;
	}

	.empty-state i {
		font-size: 2rem;
	}

	.log-entry {
		display: flex;
		gap: 0.5rem;
		padding: 0.25rem 0;
		line-height: 1.4;
	}

	.time {
		color: hsl(var(--muted));
		flex-shrink: 0;
	}

	.level {
		font-weight: 600;
		flex-shrink: 0;
	}

	.tag {
		color: hsl(var(--primary));
		flex-shrink: 0;
	}

	.message {
		color: hsl(var(--text));
		word-break: break-word;
	}
</style>
