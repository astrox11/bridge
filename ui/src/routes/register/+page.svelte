<script>
	import { goto } from '$app/navigation';
	import { base64UrlToArrayBuffer, arrayBufferToBase64Url, isPasskeySupported, getDeviceName } from '$lib/webauthn';

	let phoneNumber = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);
	let cryptoHash = $state('');
	let userId = $state('');
	let passkeySupported = $state(false);
	let passkeyRegistering = $state(false);
	let passkeyRegistered = $state(false);

	// Check if passkey is supported
	$effect(() => {
		isPasskeySupported().then(supported => {
			passkeySupported = supported;
		});
	});

	async function handleRegister() {
		if (!phoneNumber || !password) {
			error = 'All fields are required';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		loading = true;
		error = '';

		try {
			const res = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					phoneNumber,
					password
				})
			});
			const data = await res.json();

			if (data.success) {
				success = true;
				cryptoHash = data.cryptoHash;
				userId = data.user?.id || '';
			} else {
				error = data.message;
			}
		} catch (e) {
			error = 'Registration failed. Please try again.';
		} finally {
			loading = false;
		}
	}

	function copyHash() {
		navigator.clipboard.writeText(cryptoHash);
	}

	async function registerPasskey() {
		if (!passkeySupported || !userId) return;

		passkeyRegistering = true;
		error = '';

		try {
			// Get challenge from server
			const challengeRes = await fetch(`/api/auth/passkey/register/challenge/${userId}`);
			const challengeData = await challengeRes.json();

			if (!challengeData.success) {
				throw new Error(challengeData.message || 'Failed to get challenge');
			}

			// Convert challenge and user ID to ArrayBuffer
			const challenge = base64UrlToArrayBuffer(challengeData.challenge);
			const userIdBuffer = new TextEncoder().encode(challengeData.user.id);

			// Create passkey credential
			const credential = await navigator.credentials.create({
				publicKey: {
					challenge,
					rp: challengeData.rp,
					user: {
						id: userIdBuffer,
						name: challengeData.user.name,
						displayName: challengeData.user.displayName
					},
					pubKeyCredParams: challengeData.pubKeyCredParams,
					timeout: challengeData.timeout,
					attestation: challengeData.attestation,
					authenticatorSelection: challengeData.authenticatorSelection
				}
			});

			if (!credential) {
				throw new Error('No credential created');
			}

			// Send credential to server
			const registerRes = await fetch('/api/auth/passkey/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId,
					credentialId: arrayBufferToBase64Url(credential.rawId),
					publicKey: arrayBufferToBase64Url(credential.response.getPublicKey()),
					deviceName: getDeviceName()
				})
			});
			const registerData = await registerRes.json();

			if (registerData.success) {
				passkeyRegistered = true;
			} else {
				error = registerData.message || 'Failed to register passkey';
			}
		} catch (e) {
			if (e.name === 'NotAllowedError') {
				error = 'Passkey registration cancelled';
			} else {
				error = e.message || 'Failed to register passkey';
			}
		} finally {
			passkeyRegistering = false;
		}
	}
</script>

<svelte:head>
	<title>Register | Whatsaly</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-8">
	<div class="card w-full max-w-sm">
		<div class="p-6">
			{#if success}
				<!-- Success State -->
				<div class="text-center">
					<div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" 
						style="background: hsla(var(--primary) / 0.1);">
						<i class="fi fi-rr-check text-2xl" style="color: hsl(var(--primary));"></i>
					</div>
					<h1 class="text-xl font-semibold mb-2" style="color: hsl(var(--text));">
						Registration Complete!
					</h1>
					<p class="text-sm mb-6" style="color: hsl(var(--text-muted));">
						Save your unique crypto hash below. You'll need it to login.
					</p>

					<div class="p-4 rounded-lg mb-4" style="background: hsla(var(--primary) / 0.1);">
						<span class="text-xs font-medium block mb-2" style="color: hsl(var(--primary));">
							<i class="fi fi-rr-key mr-1"></i>
							Your Crypto Hash (SAVE THIS!)
						</span>
						<div class="mono text-xs break-all p-3 rounded" 
							style="background: hsl(var(--bg-secondary)); color: hsl(var(--text));"
							role="textbox"
							aria-readonly="true"
							aria-label="Your crypto hash">
							{cryptoHash}
						</div>
						<button 
							class="btn btn-secondary w-full mt-3 text-xs"
							onclick={copyHash}>
							<i class="fi fi-rr-copy"></i>
							Copy to Clipboard
						</button>
					</div>

					<div class="p-3 rounded-lg mb-6 text-left" 
						style="background: hsla(45 93% 47% / 0.1); color: hsl(45 93% 47%);">
						<div class="text-xs font-medium mb-1">
							<i class="fi fi-rr-triangle-warning mr-1"></i>
							Important
						</div>
						<p class="text-xs">
							This crypto hash is unique to you and cannot be recovered. 
							Write it down or save it securely.
						</p>
					</div>

					<!-- Passkey Registration -->
					{#if passkeySupported && !passkeyRegistered}
						<div class="p-4 rounded-lg mb-4" style="background: hsla(var(--primary) / 0.05); border: 1px dashed hsl(var(--primary));">
							<div class="text-xs font-medium mb-2" style="color: hsl(var(--primary));">
								<i class="fi fi-rr-fingerprint mr-1"></i>
								Set up Passkey (Recommended)
							</div>
							<p class="text-xs mb-3" style="color: hsl(var(--text-muted));">
								Skip typing your password next time by setting up a passkey using Face ID, Touch ID, or your device PIN.
							</p>
							<button 
								class="btn btn-secondary w-full text-xs"
								onclick={registerPasskey}
								disabled={passkeyRegistering}>
								{#if passkeyRegistering}
									<i class="fi fi-rr-spinner animate-spin"></i>
									Setting up...
								{:else}
									<i class="fi fi-rr-fingerprint"></i>
									Set up Passkey
								{/if}
							</button>
						</div>
					{:else if passkeyRegistered}
						<div class="p-3 rounded-lg mb-4 text-left" 
							style="background: hsla(var(--primary) / 0.1); color: hsl(var(--primary));">
							<div class="text-xs font-medium">
								<i class="fi fi-rr-check mr-1"></i>
								Passkey set up successfully!
							</div>
							<p class="text-xs mt-1" style="color: hsl(var(--text-muted));">
								You can now sign in without entering your password.
							</p>
						</div>
					{/if}

					{#if error}
						<div class="p-3 rounded-lg mb-4 text-sm" 
							style="background: hsla(var(--danger) / 0.1); color: hsl(var(--danger));">
							<i class="fi fi-rr-exclamation mr-2"></i>
							{error}
						</div>
					{/if}

					<a href="/login" class="btn btn-primary w-full">
						<i class="fi fi-rr-sign-in-alt"></i>
						Continue to Login
					</a>
				</div>
			{:else}
				<!-- Registration Form -->
				<div class="text-center mb-6">
					<div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" 
						style="background: hsla(var(--primary) / 0.1);">
						<i class="fi fi-rr-user-add text-2xl" style="color: hsl(var(--primary));"></i>
					</div>
					<h1 class="text-xl font-semibold" style="color: hsl(var(--text));">Create Account</h1>
					<p class="text-sm mt-1" style="color: hsl(var(--text-muted));">
						Register to get your unique access key
					</p>
				</div>

				{#if error}
					<div class="p-3 rounded-lg mb-4 text-sm" 
						style="background: hsla(var(--danger) / 0.1); color: hsl(var(--danger));">
						<i class="fi fi-rr-exclamation mr-2"></i>
						{error}
					</div>
				{/if}

				<form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
					<div class="space-y-4">
						<div>
							<label for="register-phone" class="label">Phone Number</label>
							<input 
								id="register-phone"
								type="tel" 
								bind:value={phoneNumber}
								class="input"
								placeholder="+1234567890"
								required
							/>
							<p class="text-xs mt-1" style="color: hsl(var(--text-muted));">
								Include country code (e.g., +1 for US)
							</p>
						</div>
						<div>
							<label for="register-password" class="label">Password</label>
							<input 
								id="register-password"
								type="password" 
								bind:value={password}
								class="input"
								placeholder="••••••••"
								minlength="6"
								required
							/>
						</div>
						<div>
							<label for="register-confirm-password" class="label">Confirm Password</label>
							<input 
								id="register-confirm-password"
								type="password" 
								bind:value={confirmPassword}
								class="input"
								placeholder="••••••••"
								minlength="6"
								required
							/>
						</div>
						<button 
							type="submit"
							class="btn btn-primary w-full"
							disabled={loading}>
							{#if loading}
								<i class="fi fi-rr-spinner animate-spin"></i>
								Creating account...
							{:else}
								<i class="fi fi-rr-user-add"></i>
								Create Account
							{/if}
						</button>
					</div>
				</form>

				<div class="mt-6 text-center">
					<p class="text-sm" style="color: hsl(var(--text-muted));">
						Already have an account?
						<a href="/login" class="font-medium" style="color: hsl(var(--primary));">
							Sign In
						</a>
					</p>
				</div>
			{/if}
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
