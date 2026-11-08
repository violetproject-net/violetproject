<script lang="ts">
	let { isOpen = $bindable(false) } = $props();

	let username = $state("");
	let password = $state("");
	let errorMessage = $state("");
	let isLoading = $state(false);
let isRegistering = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault(); 
		errorMessage = "";
		isLoading = true;

		try {
			const endpoint = isRegistering ? "/api/auth/sign-up/email" : "/api/auth/sign-in/username";
			const body = isRegistering
				? {
						username,
						password,
						name: username,
						email: `${username}@local.internal`
					}
				: { username, password };
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify(body)
			});
			const result = await response.json().catch(() => null);

			if (!response.ok) {
				const message = result?.message ?? result?.error?.message;
				if (isRegistering && message === "Username is already taken. Please try another.") {
					isRegistering = false;
					errorMessage = "That account already exists. Log in with this username and password.";
				} else {
					errorMessage = message ?? (isRegistering ? "Unable to create account" : "Unable to sign in");
				}
			} else {
				closeModal();
			}
		} catch (error) {
			console.error("Authentication request failed", error);
			errorMessage = isRegistering ? "Unable to create account" : "Unable to sign in";
		} finally {
			isLoading = false;
		}
	}

	function closeModal() {
		isOpen = false;
		username = "";
		password = "";
		errorMessage = "";
		isRegistering = false;
	}
</script>

{#if isOpen}

	<div class="exitlogin" onclick={closeModal} role="presentation">

		<div class="logincontent" onclick={(e) => e.stopPropagation()} role="presentation">
			
			<div class="header">
				<h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
				<button class="close-x" onclick={closeModal}>&times;</button>
			</div>
			
			{#if errorMessage}
				<div class="error-banner">
					<p>{errorMessage}</p>
				</div>
			{/if}

			<form onsubmit={handleSubmit}>
				<div class="input-group">
					<label for="username">Username</label>
					<input 
						id="username" 
						type="text" 
						bind:value={username} 
						required
						minlength="1"
						maxlength="14"
						disabled={isLoading}
						placeholder="Enter your username"
					/>
				</div>

				<div class="input-group">
					<label for="password">Password</label>
					<input 
						id="password" 
						type="password" 
						bind:value={password} 
						required 
						disabled={isLoading}
						placeholder="••••••••"
					/>
				</div>
				
				<button type="submit" class="submit-button" disabled={isLoading}>
					{isLoading ? 'Loading...' : (isRegistering ? 'Register Account' : 'Log In')}
				</button>
			</form>

			<div class="modal-footer">
				<button class="toggle-mode-btn" onclick={() => isRegistering = !isRegistering} disabled={isLoading}>
					{isRegistering ? 'Log into your account' : "Register an account"}
				</button>
			</div>
		</div>
	</div>
{/if}
