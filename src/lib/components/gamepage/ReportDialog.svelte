<script lang="ts">
	import { t } from '../../i18n.svelte';
	import Modal from './Modal.svelte';

	let {
		name,
		message = '',
		onSend,
		onClose
	}: {
		name: string;
		message?: string;
		onSend: (context: string) => void;
		onClose: () => void;
	} = $props();

	let text = $state('');
</script>

<Modal {onClose} label={t('report.aria', 'Report player')} title={t('report.confirm', 'Report {name}?', { name })}>
	{#if message}
		<div class="report-quote">“{message}”</div>
	{/if}
	<textarea
		bind:value={text}
		maxlength="500"
		rows="4"
		placeholder={t('report.context', 'Add context (optional)')}
		onkeydown={(e) => {
			e.stopPropagation();
			if (e.key === 'Escape') onClose();
		}}
	></textarea>
	<button class="report-send" onclick={() => onSend(text)}>{t('report.send', 'Send Report')}</button>
</Modal>
