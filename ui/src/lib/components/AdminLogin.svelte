<script>
	import { setAdminAuthenticated } from '$lib/stores/admin';

	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin() {
		if (!password) {
			error = 'Password is required';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/auth/admin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include', // Important: include cookies
				body: JSON.stringify({ password })
			});
			const data = await res.json();

			if (data.success) {
				setAdminAuthenticated(true);
			} else {
				error = data.message || 'Invalid password';
			}
		} catch (e) {
			error = 'Authentication failed. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center px-4" style="background: hsl(var(--bg));">
	<div class="card w-full max-w-sm">
		<div class="p-6">
			<div class="text-center mb-6">
				<div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" 
					style="background: hsla(var(--danger) / 0.1);">
					<i class="fi fi-rr-shield text-2xl" style="color: hsl(var(--danger));"></i>
				</div>
				<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">Admin Access</h1>
				<p class="text-sm mt-1" style="color: hsl(var(--text-muted));">
					Enter admin password to continue
				</p>
			</div>

			{#if error}
				<div class="p-3 rounded-lg mb-4 text-sm" 
					style="background: hsla(var(--danger) / 0.1); color: hsl(var(--danger));">
					<i class="fi fi-rr-exclamation mr-2"></i>
					{error}
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
				<div class="space-y-4">
					<div>
						<label for="admin-password" class="label">Admin Password</label>
						<input 
							id="admin-password"
							type="password" 
							bind:value={password}
							class="input"
							placeholder="••••••••"
							required
							autofocus
						/>
					</div>
					<button 
						type="submit"
						class="btn btn-primary w-full"
						disabled={loading}>
						{#if loading}
							<i class="fi fi-rr-spinner animate-spin"></i>
							Authenticating...
						{:else}
							<i class="fi fi-rr-lock"></i>
							Access Terminal
						{/if}
					</button>
				</div>
			</form>

			<div class="mt-6 text-center">
				<a href="/login" class="text-sm" style="color: hsl(var(--text-muted));">
					<i class="fi fi-rr-arrow-left mr-1"></i>
					Back to User Login
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
