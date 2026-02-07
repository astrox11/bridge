<script>
	import { goto } from '$app/navigation';

	let phoneNumber = $state('');
	let password = $state('');
	let cryptoHash = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin() {
		if (!phoneNumber || !password || !cryptoHash) {
			error = 'All fields are required';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber,
					password,
					cryptoHash
				})
			});
			const data = await res.json();

			if (data.success) {
				// Redirect to user dashboard
				goto(`/user/${cryptoHash}`);
			} else {
				error = data.message;
			}
		} catch (e) {
			error = 'Login failed. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login | Whatsaly</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="card w-full max-w-sm">
		<div class="p-6">
			<div class="text-center mb-6">
				<div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" 
					style="background: hsla(var(--primary) / 0.1);">
					<i class="fi fi-rr-user text-2xl" style="color: hsl(var(--primary));"></i>
				</div>
				<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">Welcome Back</h1>
				<p class="text-sm mt-1" style="color: hsl(var(--text-muted));">
					Sign in to your dashboard
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
						<label class="label">Phone Number</label>
						<input 
							type="tel" 
							bind:value={phoneNumber}
							class="input"
							placeholder="+1234567890"
							required
						/>
					</div>
					<div>
						<label class="label">Password</label>
						<input 
							type="password" 
							bind:value={password}
							class="input"
							placeholder="••••••••"
							required
						/>
					</div>
					<div>
						<label class="label">
							Crypto Hash
							<span class="text-xs font-normal ml-1" style="color: hsl(var(--text-muted));">
								(Your unique key)
							</span>
						</label>
						<input 
							type="text" 
							bind:value={cryptoHash}
							class="input mono text-xs"
							placeholder="Your unique cryptographic hash"
							required
						/>
					</div>
					<button 
						type="submit"
						class="btn btn-primary w-full"
						disabled={loading}>
						{#if loading}
							<i class="fi fi-rr-spinner animate-spin"></i>
							Signing in...
						{:else}
							<i class="fi fi-rr-sign-in-alt"></i>
							Sign In
						{/if}
					</button>
				</div>
			</form>

			<div class="mt-6 text-center">
				<p class="text-sm" style="color: hsl(var(--text-muted));">
					Don't have an account?
					<a href="/register" class="font-medium" style="color: hsl(var(--primary));">
						Register
					</a>
				</p>
			</div>

			<div class="mt-4 pt-4 border-t text-center" style="border-color: hsl(var(--border));">
				<a href="/" class="text-xs" style="color: hsl(var(--text-muted));">
					<i class="fi fi-rr-shield mr-1"></i>
					Admin Access
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
