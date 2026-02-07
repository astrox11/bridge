<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let requests = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let showForm = $state(false);
	let subject = $state('');
	let message = $state('');
	let submitting = $state(false);

	$effect(() => {
		const hash = $page.params.hash;
		if (hash) {
			fetchRequests(hash);
		}
	});

	async function fetchRequests(hash) {
		try {
			loading = true;
			const res = await fetch(`/api/user/${hash}/support`);
			const data = await res.json();
			
			if (data.success) {
				requests = data.requests;
			} else {
				error = data.message;
			}
		} catch (e) {
			error = 'Failed to load support requests';
		} finally {
			loading = false;
		}
	}

	async function submitRequest() {
		if (!subject.trim() || !message.trim()) {
			alert('Please fill in all fields');
			return;
		}

		submitting = true;
		try {
			const res = await fetch(`/api/user/${$page.params.hash}/support`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ subject, message })
			});
			const data = await res.json();
			
			if (data.success) {
				subject = '';
				message = '';
				showForm = false;
				await fetchRequests($page.params.hash);
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Failed to submit request');
		} finally {
			submitting = false;
		}
	}

	function formatDate(date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(status) {
		switch (status) {
			case 'open': return 'var(--primary)';
			case 'in_progress': return '45 93% 47%';
			case 'resolved': return '142 76% 36%';
			case 'closed': return 'var(--text-muted)';
			default: return 'var(--text-muted)';
		}
	}
</script>

<svelte:head>
	<title>Support | Whatsaly</title>
</svelte:head>

<section class="space-y-6 fade-in">
	<div class="flex justify-between items-center">
		<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">Support</h1>
		<button class="btn btn-primary" onclick={() => showForm = !showForm}>
			<i class="fi {showForm ? 'fi-rr-cross' : 'fi-rr-plus'}"></i>
			{showForm ? 'Cancel' : 'New Request'}
		</button>
	</div>

	<!-- New Request Form -->
	{#if showForm}
		<div class="card fade-in">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-edit text-sm" style="color: hsl(var(--primary));"></i>
				<span>Submit Support Request</span>
			</div>
			<div class="p-4 space-y-4">
				<div>
					<label for="support-subject" class="label">Subject</label>
					<input 
						id="support-subject"
						type="text" 
						bind:value={subject}
						class="input"
						placeholder="Brief description of your issue"
					/>
				</div>
				<div>
					<label for="support-message" class="label">Message</label>
					<textarea 
						id="support-message"
						bind:value={message}
						class="input min-h-[120px]"
						placeholder="Describe your issue in detail..."
					></textarea>
				</div>
				<div class="flex justify-end gap-2">
					<button class="btn btn-secondary" onclick={() => showForm = false}>
						Cancel
					</button>
					<button 
						class="btn btn-primary"
						onclick={submitRequest}
						disabled={submitting || !subject.trim() || !message.trim()}>
						{#if submitting}
							<i class="fi fi-rr-spinner animate-spin"></i>
						{:else}
							<i class="fi fi-rr-paper-plane"></i>
						{/if}
						Submit
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Contact Info -->
	<div class="card">
		<div class="card-header flex items-center gap-2">
			<i class="fi fi-rr-headset text-sm" style="color: hsl(var(--primary));"></i>
			<span>Contact Us</span>
		</div>
		<div class="p-4">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="contact-item">
					<i class="fi fi-rr-envelope"></i>
					<div>
						<div class="font-medium">Email</div>
						<div class="text-sm" style="color: hsl(var(--text-muted));">support@whatsaly.com</div>
					</div>
				</div>
				<div class="contact-item">
					<i class="fi fi-rr-clock"></i>
					<div>
						<div class="font-medium">Response Time</div>
						<div class="text-sm" style="color: hsl(var(--text-muted));">Within 24 hours</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Requests List -->
	<div class="card">
		<div class="card-header flex items-center gap-2">
			<i class="fi fi-rr-list text-sm" style="color: hsl(var(--primary));"></i>
			<span>Your Requests</span>
		</div>
		<div>
			{#if loading}
				{#each [1, 2] as _}
					<div class="p-4 border-b" style="border-color: hsl(var(--border));">
						<div class="shimmer h-4 w-48 rounded mb-2"></div>
						<div class="shimmer h-3 w-32 rounded"></div>
					</div>
				{/each}
			{:else if error}
				<div class="p-8 text-center">
					<i class="fi fi-rr-exclamation text-2xl mb-2" style="color: hsl(var(--danger));"></i>
					<p style="color: hsl(var(--text-muted));">{error}</p>
				</div>
			{:else if requests.length === 0}
				<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
					<i class="fi fi-rr-comment text-2xl mb-2 block opacity-40"></i>
					<p class="text-sm">No support requests yet</p>
				</div>
			{:else}
				{#each requests as req}
					<div class="request-item">
						<div class="flex items-start gap-3">
							<div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
								style="background: hsla({getStatusColor(req.status)} / 0.1);">
								<i class="fi fi-rr-ticket" style="color: hsl({getStatusColor(req.status)});"></i>
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-medium text-sm truncate" style="color: hsl(var(--text));">
										{req.subject}
									</span>
									<span class="text-[10px] px-2 py-0.5 rounded-full capitalize"
										style="background: hsla({getStatusColor(req.status)} / 0.1); color: hsl({getStatusColor(req.status)});">
										{req.status.replace('_', ' ')}
									</span>
								</div>
								<p class="text-xs line-clamp-2 mb-1" style="color: hsl(var(--text-muted));">
									{req.message}
								</p>
								<div class="text-xs" style="color: hsl(var(--text-muted));">
									{formatDate(req.createdAt)}
								</div>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</section>

<style>
	.contact-item {
		@apply flex items-center gap-3 p-3 rounded-lg;
		background: hsl(var(--bg));
	}

	.contact-item i {
		@apply text-lg;
		color: hsl(var(--primary));
	}

	.request-item {
		@apply p-4 border-b last:border-0;
		border-color: hsl(var(--border));
	}

	.request-item:hover {
		background: hsla(var(--text) / 0.02);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
