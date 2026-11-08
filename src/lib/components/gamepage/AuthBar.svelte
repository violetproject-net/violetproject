<script lang="ts">
	import { getContext } from 'svelte';
	import { refreshAll } from '$app/navigation';
	import { t } from '../../i18n.svelte';

	let { displayName, updateReady }: { displayName?: string; updateReady: boolean } = $props();

	const { openLogin } = getContext<{ openLogin: () => void }>('authControl');

	let isLoggingOut = $state(false);

	async function logout() {
		isLoggingOut = true;
		try {
			const response = await fetch('/api/auth/sign-out', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'same-origin',
				body: JSON.stringify({})
			});
			if (!response.ok) throw new Error(`Logout failed with status ${response.status}`);
			await refreshAll();
		} catch (error) {
			console.error('Logout request failed', error);
		} finally {
			isLoggingOut = false;
		}
	}
</script>

<div class="auth-bar">
	{#if displayName}
		<span>{t('auth.loggedInAs', 'Logged in as {name}', { name: displayName })}</span>
	{:else}
		<span>{t('auth.notLoggedIn', 'Not logged in')}</span>
	{/if}
	{#if updateReady}
		<button class="update-flag" onclick={() => location.reload()}>{t('app.reloadToUpdate', 'reload to update')}</button>
        <button class="update-flag" onclick={() => updateReady = false }>X</button>
	{/if}
	{#if displayName}
		<button class="login-button" onclick={logout} disabled={isLoggingOut}>
			{isLoggingOut ? t('auth.loggingOut', 'Logging out...') : t('auth.logOut', 'Log out')}
		</button>
	{:else}
		<button class="login-button" onclick={openLogin}>{t('auth.logIn', 'Log in')}</button>
	{/if}
</div>
