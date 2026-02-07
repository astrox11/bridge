<script>
	import { goto } from '$app/navigation';
	import { base64UrlToArrayBuffer, arrayBufferToBase64Url, isPasskeySupported } from '$lib/webauthn';

	let phoneNumber = $state('');
	let password = $state('');
	let cryptoHash = $state('');
	let loading = $state(false);
	let passkeyLoading = $state(false);
	let error = $state('');
	let passkeySupported = $state(false);

	// Check if passkey is supported
	$effect(() => {
		isPasskeySupported().then(supported => {
			passkeySupported = supported;
		});
	});

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

	async function handlePasskeyLogin() {
		if (!passkeySupported) {
			error = 'Passkey not supported on this device';
			return;
		}

		passkeyLoading = true;
		error = '';

		try {
			// Get challenge from server
			const challengeRes = await fetch('/api/auth/passkey/login/challenge');
			const challengeData = await challengeRes.json();

			if (!challengeData.success) {
				throw new Error(challengeData.message || 'Failed to get challenge');
			}

			// Convert challenge from base64url to ArrayBuffer
			const challenge = base64UrlToArrayBuffer(challengeData.challenge);

			// Request passkey authentication
			const credential = await navigator.credentials.get({
				publicKey: {
					challenge,
					rpId: challengeData.rpId,
					timeout: challengeData.timeout,
					userVerification: challengeData.userVerification
				}
			});

			if (!credential) {
				throw new Error('No credential returned');
			}

			// Send credential to server for verification
			const authRes = await fetch('/api/auth/passkey/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					credentialId: arrayBufferToBase64Url(credential.rawId),
					authenticatorData: arrayBufferToBase64Url(credential.response.authenticatorData),
					clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
					signature: arrayBufferToBase64Url(credential.response.signature)
				})
			});
			const authData = await authRes.json();

			if (authData.success && authData.cryptoHash) {
				goto(`/user/${authData.cryptoHash}`);
			} else {
				error = authData.message || 'Passkey authentication failed';
			}
		} catch (e) {
			if (e.name === 'NotAllowedError') {
				error = 'Authentication cancelled';
			} else {
				error = e.message || 'Passkey login failed';
			}
		} finally {
			passkeyLoading = false;
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
						<label for="login-phone" class="label">Phone Number</label>
						<input 
							id="login-phone"
							type="tel" 
							bind:value={phoneNumber}
							class="input"
							placeholder="+1234567890"
							required
						/>
					</div>
					<div>
						<label for="login-password" class="label">Password</label>
						<input 
							id="login-password"
							type="password" 
							bind:value={password}
							class="input"
							placeholder="••••••••"
							required
						/>
					</div>
					<div>
						<label for="login-crypto-hash" class="label">
							Crypto Hash
							<span class="text-xs font-normal ml-1" style="color: hsl(var(--text-muted));">
								(Your unique key)
							</span>
						</label>
						<input 
							id="login-crypto-hash"
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

			<!-- Passkey Login -->
			{#if passkeySupported}
				<div class="my-4 flex items-center gap-3">
					<div class="flex-1 h-px" style="background: hsl(var(--border));"></div>
					<span class="text-xs" style="color: hsl(var(--text-muted));">or</span>
					<div class="flex-1 h-px" style="background: hsl(var(--border));"></div>
				</div>

				<button 
					type="button"
					class="btn btn-secondary w-full"
					onclick={handlePasskeyLogin}
					disabled={passkeyLoading}>
					{#if passkeyLoading}
						<i class="fi fi-rr-spinner animate-spin"></i>
						Authenticating...
					{:else}
						<i class="fi fi-rr-fingerprint"></i>
						Sign in with Passkey
					{/if}
				</button>
			{/if}

			<div class="mt-6 text-center">
				<p class="text-sm" style="color: hsl(var(--text-muted));">
					Don't have an account?
					<a href="/register" class="font-medium" style="color: hsl(var(--primary));">
						Register
					</a>
				</p>
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
