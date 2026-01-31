<script>
	/** @type {boolean} */
	export let open = false;

	/** @type {'setup' | 'loading' | 'result'} */
	let view = 'setup';

	let country = '234';
	let phone = '';
	let pairingCode = '';

	function close() {
		open = false;
		view = 'setup';
		phone = '';
		pairingCode = '';
	}

	async function doPair() {
		const cleanPhone = phone.trim().replace(/^0/, '');
		if (!cleanPhone) return;

		const fullNumber = country + cleanPhone;
		view = 'loading';

		try {
			await fetch(`/api/instances/${fullNumber}/pair`, { method: 'POST' });

			let attempts = 0;
			const poll = setInterval(async () => {
				attempts++;
				const res = await fetch(`/api/instances/${fullNumber}`);
				const data = await res.json();

				if (data.pairing_code) {
					clearInterval(poll);
					pairingCode = data.pairing_code;
					view = 'result';
				}

				if (attempts >= 20) {
					clearInterval(poll);
					close();
				}
			}, 2000);
		} catch (e) {
			close();
		}
	}

	function copyCode() {
		navigator.clipboard.writeText(pairingCode);
		alert('Code copied!');
	}
</script>

{#if open}
	<div 
		class="modal-backdrop"
		onclick={close}
		onkeydown={(e) => e.key === 'Escape' && close()}
		role="dialog"
		aria-modal="true"
	>
		<div 
			class="modal-card"
			onclick={(e) => e.stopPropagation()}
			onkeydown={() => {}}
			role="document"
		>
			<div class="card-header flex justify-between items-center">
				<span>Link Device</span>
				<button onclick={close} class="close-btn">
					<i class="fi fi-rr-cross-small"></i>
				</button>
			</div>

			{#if view === 'setup'}
				<div class="p-5 space-y-4">
					<div>
						<label for="country-select" class="label">Region</label>
						<select id="country-select" bind:value={country} class="input">
							<option value="234">Nigeria (+234)</option>
							<option value="1">USA (+1)</option>
						</select>
					</div>
					<div>
						<label for="phone-input" class="label">Phone Number</label>
						<input id="phone-input" type="text" bind:value={phone} placeholder="8123456789" class="input" />
					</div>
					<button onclick={doPair} class="btn btn-primary w-full">
						Generate Code
					</button>
				</div>
			{:else if view === 'loading'}
				<div class="p-12 text-center">
					<div class="spinner"></div>
					<p class="text-sm mt-3" style="color: hsl(var(--text-muted));">Generating code...</p>
				</div>
			{:else if view === 'result'}
				<div class="p-5 text-center">
					<p class="text-xs font-medium mb-3" style="color: hsl(var(--text-muted));">Your pairing code</p>
					<div class="code-display">
						{pairingCode}
					</div>
					<button onclick={copyCode} class="btn btn-secondary w-full mb-3">
						<i class="fi fi-rr-copy"></i> Copy
					</button>
					<button onclick={close} class="text-sm" style="color: hsl(var(--text-muted));">
						Done
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.close-btn {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--text-muted));
		transition: background-color 0.15s;
	}

	.close-btn:hover {
		background: hsla(var(--text) / 0.08);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 2px solid hsl(var(--border));
		border-top-color: hsl(var(--primary));
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 auto;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.code-display {
		font-family: 'Roboto Mono', monospace;
		font-size: 1.875rem;
		font-weight: 700;
		padding: 1rem 1.5rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		letter-spacing: 0.2em;
		background: hsl(var(--bg));
		color: hsl(var(--primary));
	}
</style>
