<script>
	import { onMount, onDestroy } from 'svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import PerformanceChart from '$lib/components/PerformanceChart.svelte';
	import SessionList from '$lib/components/SessionList.svelte';

	let cpu = $state(null);
	let memory = $state(null);
	let disk = $state(null);
	let cpuHistory = $state([]);
	let sessions = $state([]);
	let loading = $state(true);
	let sessionsLoading = $state(true);
	
	// User management state
	let activeTab = $state('overview');
	let users = $state([]);
	let usersLoading = $state(true);
	let groupedInstances = $state({ groups: [], orphanInstances: [] });
	let groupedLoading = $state(true);
	let supportRequests = $state([]);
	let supportLoading = $state(true);
	let selectedUser = $state(null);
	let userBilling = $state(null);
	let billingLoading = $state(false);
	let actionLoading = $state(null);

	/** @type {EventSource | null} */
	let systemStream = null;
	/** @type {EventSource | null} */
	let instanceStream = null;

	onMount(() => {
		// System metrics stream
		systemStream = new EventSource('/api/system/stream');
		systemStream.onmessage = (e) => {
			const data = JSON.parse(e.data);
			cpu = data.cpu.toFixed(1) + '%';
			memory = data.memory.toFixed(1) + '%';
			disk = (data.disk || 0).toFixed(1) + '%';
			cpuHistory = [...cpuHistory, data.cpu].slice(-30);
			loading = false;
		};

		// Instance stream
		instanceStream = new EventSource('/api/instances/stream');
		instanceStream.onmessage = (e) => {
			try {
				sessions = JSON.parse(e.data);
				sessionsLoading = false;
			} catch (err) {
				console.error('Instance parse error:', err);
			}
		};

		// Fetch admin data
		fetchUsers();
		fetchGroupedInstances();
		fetchSupportRequests();
	});

	onDestroy(() => {
		systemStream?.close();
		instanceStream?.close();
	});

	async function fetchUsers() {
		try {
			usersLoading = true;
			const res = await fetch('/api/admin/users', { credentials: 'include' });
			const data = await res.json();
			if (data.success) {
				users = data.users;
			}
		} catch (e) {
			console.error('Failed to fetch users:', e);
		} finally {
			usersLoading = false;
		}
	}

	async function fetchGroupedInstances() {
		try {
			groupedLoading = true;
			const res = await fetch('/api/admin/instances/grouped', { credentials: 'include' });
			const data = await res.json();
			if (data.success) {
				groupedInstances = { groups: data.groups, orphanInstances: data.orphanInstances };
			}
		} catch (e) {
			console.error('Failed to fetch grouped instances:', e);
		} finally {
			groupedLoading = false;
		}
	}

	async function fetchSupportRequests() {
		try {
			supportLoading = true;
			const res = await fetch('/api/admin/support', { credentials: 'include' });
			const data = await res.json();
			if (data.success) {
				supportRequests = data.requests;
			}
		} catch (e) {
			console.error('Failed to fetch support requests:', e);
		} finally {
			supportLoading = false;
		}
	}

	async function viewUserBilling(user) {
		selectedUser = user;
		billingLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${user.id}/billing`, { credentials: 'include' });
			const data = await res.json();
			if (data.success) {
				userBilling = data;
			}
		} catch (e) {
			console.error('Failed to fetch billing:', e);
		} finally {
			billingLoading = false;
		}
	}

	async function suspendUser(userId, suspended) {
		actionLoading = `suspend-${userId}`;
		try {
			const res = await fetch(`/api/admin/users/${userId}/suspend`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ suspended })
			});
			const data = await res.json();
			if (data.success) {
				await fetchUsers();
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Failed to update user');
		} finally {
			actionLoading = null;
		}
	}

	async function setUserLimit(userId, limit) {
		const newLimit = prompt('Enter new instance limit:', limit);
		if (newLimit === null) return;
		
		actionLoading = `limit-${userId}`;
		try {
			const res = await fetch(`/api/admin/users/${userId}/limit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ limit: parseInt(newLimit, 10) })
			});
			const data = await res.json();
			if (data.success) {
				await fetchUsers();
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Failed to update limit');
		} finally {
			actionLoading = null;
		}
	}

	async function deleteUser(userId) {
		if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
			return;
		}
		
		actionLoading = `delete-${userId}`;
		try {
			const res = await fetch(`/api/admin/users/${userId}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			const data = await res.json();
			if (data.success) {
				selectedUser = null;
				userBilling = null;
				await fetchUsers();
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Failed to delete user');
		} finally {
			actionLoading = null;
		}
	}

	async function updateSupportStatus(requestId, status) {
		try {
			const res = await fetch(`/api/admin/support/${requestId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ status })
			});
			const data = await res.json();
			if (data.success) {
				await fetchSupportRequests();
			} else {
				alert(data.message);
			}
		} catch (e) {
			alert('Failed to update status');
		}
	}

	function formatDate(date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Admin Dashboard | Whatsaly</title>
</svelte:head>

<section class="space-y-4 md:space-y-6 fade-in">
	<!-- Tab Navigation -->
	<div class="flex gap-2 border-b pb-2" style="border-color: hsl(var(--border));">
		<button 
			class="tab-btn {activeTab === 'overview' ? 'active' : ''}"
			onclick={() => activeTab = 'overview'}>
			<i class="fi fi-rr-chart-pie"></i>
			Overview
		</button>
		<button 
			class="tab-btn {activeTab === 'users' ? 'active' : ''}"
			onclick={() => activeTab = 'users'}>
			<i class="fi fi-rr-users"></i>
			Users
		</button>
		<button 
			class="tab-btn {activeTab === 'instances' ? 'active' : ''}"
			onclick={() => activeTab = 'instances'}>
			<i class="fi fi-rr-server"></i>
			Instances
		</button>
		<button 
			class="tab-btn {activeTab === 'support' ? 'active' : ''}"
			onclick={() => activeTab = 'support'}>
			<i class="fi fi-rr-headset"></i>
			Support
		</button>
	</div>

	<!-- Overview Tab -->
	{#if activeTab === 'overview'}
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
			<StatCard label="Processor" icon="fi-rr-microchip" value={cpu} loading={loading} />
			<StatCard label="Memory" icon="fi-rr-database" value={memory} loading={loading} />
			<StatCard label="Disk" icon="fi-rr-folder-open" value={disk} loading={loading} />
		</div>

		<PerformanceChart data={cpuHistory} />

		<SessionList sessions={sessions} loading={sessionsLoading} />
	{/if}

	<!-- Users Tab -->
	{#if activeTab === 'users'}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
			<!-- Users List -->
			<div class="card">
				<div class="card-header flex items-center gap-2">
					<i class="fi fi-rr-users text-sm" style="color: hsl(var(--primary));"></i>
					<span>Registered Users ({users.length})</span>
				</div>
				{#if usersLoading}
					{#each [1, 2, 3] as _}
						<div class="p-4 border-b" style="border-color: hsl(var(--border));">
							<div class="shimmer h-4 w-32 rounded mb-2"></div>
							<div class="shimmer h-3 w-24 rounded"></div>
						</div>
					{/each}
				{:else if users.length === 0}
					<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
						No users registered yet
					</div>
				{:else}
					{#each users as user}
						<div class="user-item {selectedUser?.id === user.id ? 'selected' : ''}" onclick={() => viewUserBilling(user)}>
							<div class="flex items-center gap-3">
								<div class="w-10 h-10 rounded-full flex items-center justify-center"
									style="background: hsla(var(--primary) / 0.1);">
									<i class="fi fi-rr-user" style="color: hsl(var(--primary));"></i>
								</div>
								<div class="flex-1 min-w-0">
									<div class="font-medium text-sm truncate" style="color: hsl(var(--text));">
										{user.phoneNumber}
									</div>
									<div class="text-xs flex items-center gap-2" style="color: hsl(var(--text-muted));">
										<span>{user.instanceCount} instance(s)</span>
										<span>•</span>
										<span>${user.credits.toFixed(2)} credits</span>
										{#if user.suspended}
											<span class="px-1.5 py-0.5 rounded text-[10px] font-medium" 
												style="background: hsla(var(--danger) / 0.1); color: hsl(var(--danger));">
												Suspended
											</span>
										{/if}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-1 mt-2">
								<button 
									class="action-btn-sm {user.suspended ? 'success' : 'danger'}"
									onclick={(e) => { e.stopPropagation(); suspendUser(user.id, !user.suspended); }}
									disabled={actionLoading === `suspend-${user.id}`}>
									{#if actionLoading === `suspend-${user.id}`}
										<i class="fi fi-rr-spinner animate-spin"></i>
									{:else}
										<i class="fi {user.suspended ? 'fi-rr-check' : 'fi-rr-ban'}"></i>
									{/if}
									{user.suspended ? 'Unsuspend' : 'Suspend'}
								</button>
								<button 
									class="action-btn-sm"
									onclick={(e) => { e.stopPropagation(); setUserLimit(user.id, user.instanceLimit); }}
									disabled={actionLoading === `limit-${user.id}`}>
									<i class="fi fi-rr-settings-sliders"></i>
									Limit: {user.instanceLimit}
								</button>
								<button 
									class="action-btn-sm danger"
									onclick={(e) => { e.stopPropagation(); deleteUser(user.id); }}
									disabled={actionLoading === `delete-${user.id}`}>
									<i class="fi fi-rr-trash"></i>
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- User Billing Details -->
			<div class="card">
				<div class="card-header flex items-center gap-2">
					<i class="fi fi-rr-receipt text-sm" style="color: hsl(var(--primary));"></i>
					<span>Billing Details</span>
				</div>
				{#if !selectedUser}
					<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
						<i class="fi fi-rr-cursor text-2xl mb-2 block opacity-40"></i>
						<p class="text-sm">Select a user to view billing details</p>
					</div>
				{:else if billingLoading}
					<div class="p-4 space-y-4">
						{#each [1, 2] as _}
							<div class="shimmer h-16 w-full rounded"></div>
						{/each}
					</div>
				{:else if userBilling}
					<div class="p-4 space-y-4">
						<div class="grid grid-cols-2 gap-3">
							<div class="p-3 rounded-lg" style="background: hsla(var(--primary) / 0.1);">
								<div class="text-xs" style="color: hsl(var(--text-muted));">Credits</div>
								<div class="text-xl font-semibold" style="color: hsl(var(--primary));">
									${userBilling.user.credits.toFixed(2)}
								</div>
							</div>
							<div class="p-3 rounded-lg" style="background: hsla(var(--text) / 0.05);">
								<div class="text-xs" style="color: hsl(var(--text-muted));">Instances</div>
								<div class="text-xl font-semibold" style="color: hsl(var(--text));">
									{userBilling.instances.length}
								</div>
							</div>
						</div>

						<div>
							<h4 class="text-sm font-medium mb-2" style="color: hsl(var(--text));">Instance Usage</h4>
							{#if userBilling.instances.length === 0}
								<p class="text-sm" style="color: hsl(var(--text-muted));">No instances</p>
							{:else}
								{#each userBilling.instances as instance}
									<div class="p-2 rounded text-xs mb-1" style="background: hsla(var(--text) / 0.03);">
										<div class="flex justify-between">
											<span style="color: hsl(var(--text));">{instance.name || instance.sessionId}</span>
											<span style="color: hsl(var(--text-muted));">{instance.status}</span>
										</div>
										<div class="flex justify-between mt-1" style="color: hsl(var(--text-muted));">
											<span>{instance.usageMinutes} mins</span>
											<span>${instance.cost.toFixed(2)}</span>
										</div>
									</div>
								{/each}
							{/if}
						</div>

						<div>
							<h4 class="text-sm font-medium mb-2" style="color: hsl(var(--text));">Recent Transactions</h4>
							{#if userBilling.transactions.length === 0}
								<p class="text-sm" style="color: hsl(var(--text-muted));">No transactions</p>
							{:else}
								{#each userBilling.transactions.slice(0, 5) as tx}
									<div class="flex justify-between text-xs py-1">
										<span style="color: hsl(var(--text-muted));">{tx.description || tx.type}</span>
										<span style="color: {tx.type === 'credit' ? 'hsl(142 76% 36%)' : 'hsl(var(--danger))'};">
											{tx.type === 'credit' ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
										</span>
									</div>
								{/each}
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Instances Tab (Grouped by User) -->
	{#if activeTab === 'instances'}
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-server text-sm" style="color: hsl(var(--primary));"></i>
				<span>Instances by User</span>
			</div>
			{#if groupedLoading}
				{#each [1, 2] as _}
					<div class="p-4 border-b" style="border-color: hsl(var(--border));">
						<div class="shimmer h-4 w-48 rounded mb-2"></div>
						<div class="shimmer h-16 w-full rounded"></div>
					</div>
				{/each}
			{:else}
				{#each groupedInstances.groups as group}
					<div class="p-4 border-b" style="border-color: hsl(var(--border));">
						<div class="flex items-center gap-2 mb-3">
							<i class="fi fi-rr-user text-sm" style="color: hsl(var(--primary));"></i>
							<span class="font-medium text-sm" style="color: hsl(var(--text));">
								{group.userPhone}
							</span>
							<span class="text-xs px-2 py-0.5 rounded" style="background: hsla(var(--primary) / 0.1); color: hsl(var(--primary));">
								{group.instances.length} instance(s)
							</span>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{#each group.instances as instance}
								<div class="p-3 rounded-lg text-xs" style="background: hsla(var(--text) / 0.03);">
									<div class="flex items-center justify-between mb-1">
										<span class="font-medium" style="color: hsl(var(--text));">
											{instance.name || 'Unnamed'}
										</span>
										<span class="px-1.5 py-0.5 rounded capitalize"
											style="background: hsla({instance.status === 'connected' ? 'var(--primary)' : instance.status === 'paused' ? '45 93% 47%' : 'var(--danger)'} / 0.1); color: hsl({instance.status === 'connected' ? 'var(--primary)' : instance.status === 'paused' ? '45 93% 47%' : 'var(--danger)'});">
											{instance.status}
										</span>
									</div>
									<div class="mono truncate" style="color: hsl(var(--text-muted));">
										{instance.sessionId}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}

				{#if groupedInstances.orphanInstances.length > 0}
					<div class="p-4">
						<div class="flex items-center gap-2 mb-3">
							<i class="fi fi-rr-interrogation text-sm" style="color: hsl(var(--text-muted));"></i>
							<span class="font-medium text-sm" style="color: hsl(var(--text));">
								Unassigned Instances (Admin)
							</span>
						</div>
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
							{#each groupedInstances.orphanInstances as instance}
								<div class="p-3 rounded-lg text-xs" style="background: hsla(var(--text) / 0.03);">
									<div class="font-medium mb-1" style="color: hsl(var(--text));">
										{instance.name || 'Unnamed'}
									</div>
									<div class="mono truncate" style="color: hsl(var(--text-muted));">
										{instance.sessionId}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Support Tab -->
	{#if activeTab === 'support'}
		<div class="card">
			<div class="card-header flex items-center gap-2">
				<i class="fi fi-rr-headset text-sm" style="color: hsl(var(--primary));"></i>
				<span>Support Requests ({supportRequests.length})</span>
			</div>
			{#if supportLoading}
				{#each [1, 2, 3] as _}
					<div class="p-4 border-b" style="border-color: hsl(var(--border));">
						<div class="shimmer h-4 w-48 rounded mb-2"></div>
						<div class="shimmer h-3 w-32 rounded"></div>
					</div>
				{/each}
			{:else if supportRequests.length === 0}
				<div class="p-8 text-center" style="color: hsl(var(--text-muted));">
					No support requests
				</div>
			{:else}
				{#each supportRequests as req}
					<div class="p-4 border-b last:border-0" style="border-color: hsl(var(--border));">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-medium text-sm" style="color: hsl(var(--text));">
										{req.subject}
									</span>
									<span class="px-2 py-0.5 rounded text-[10px] font-medium capitalize"
										style="background: hsla({req.status === 'open' ? 'var(--primary)' : req.status === 'in_progress' ? '45 93% 47%' : '142 76% 36%'} / 0.1); color: hsl({req.status === 'open' ? 'var(--primary)' : req.status === 'in_progress' ? '45 93% 47%' : '142 76% 36%'});">
										{req.status.replace('_', ' ')}
									</span>
								</div>
								<p class="text-xs mb-2 line-clamp-2" style="color: hsl(var(--text-muted));">
									{req.message}
								</p>
								<div class="text-xs flex items-center gap-2" style="color: hsl(var(--text-muted));">
									<span>
										<i class="fi fi-rr-envelope mr-1"></i>
										{req.email}
									</span>
									<span>•</span>
									<span>{formatDate(req.createdAt)}</span>
								</div>
							</div>
							<div class="flex flex-col gap-1">
								<select 
									class="text-xs px-2 py-1 rounded border"
									style="background: hsl(var(--bg)); color: hsl(var(--text)); border-color: hsl(var(--border));"
									value={req.status}
									onchange={(e) => updateSupportStatus(req.id, e.target.value)}>
									<option value="open">Open</option>
									<option value="in_progress">In Progress</option>
									<option value="resolved">Resolved</option>
									<option value="closed">Closed</option>
								</select>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</section>

<style>
	.tab-btn {
		@apply flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors;
		color: hsl(var(--text-muted));
	}

	.tab-btn:hover {
		background: hsla(var(--text) / 0.05);
	}

	.tab-btn.active {
		background: hsla(var(--primary) / 0.1);
		color: hsl(var(--primary));
	}

	.user-item {
		@apply p-3 border-b cursor-pointer transition-colors;
		border-color: hsl(var(--border));
	}

	.user-item:hover {
		background: hsla(var(--text) / 0.02);
	}

	.user-item.selected {
		background: hsla(var(--primary) / 0.05);
	}

	.action-btn-sm {
		@apply flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors;
		background: hsl(var(--bg));
		color: hsl(var(--text-muted));
		border: 1px solid hsl(var(--border));
	}

	.action-btn-sm:hover:not(:disabled) {
		background: hsla(var(--text) / 0.05);
	}

	.action-btn-sm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn-sm.danger {
		color: hsl(var(--danger));
		border-color: hsl(var(--danger));
	}

	.action-btn-sm.success {
		color: hsl(142 76% 36%);
		border-color: hsl(142 76% 36%);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
