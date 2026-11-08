<script lang="ts">
    import { getGameContext } from '#lib/gamepage/context.ts';
	import { t } from '../../i18n.svelte';

	let {
		value = $bindable(''),
		input = $bindable(null),
		onSend,
		openGuestPopup
	}: {
		value: string;
		input?: HTMLInputElement | null;
		onSend: () => void;
		openGuestPopup: () => void;
	} = $props();

	function toGame(el: HTMLElement) {
		el.blur();
		document.getElementById('canvas')?.focus();
	}
</script>

<div class="chat-row">
	{#if getGameContext().loggedIn}
		<input
			bind:value
			bind:this={input}
			maxlength="280"
			placeholder={t('chat.inputPlaceholder', 'Chat (Tab)')}
			onkeydown={(e) => {
				e.stopPropagation();
				if (e.key === 'Enter') onSend();
				else if (e.key === 'Tab') {
					e.preventDefault();
					toGame(e.currentTarget);
				} else if (e.key === 'Escape') toGame(e.currentTarget);
			}}
		/>
	{:else}
		<button onclick={openGuestPopup}>{t('chat.guestNotice', 'Playing as guest (Click or tap for more info)')}</button>
	{/if}
</div>
