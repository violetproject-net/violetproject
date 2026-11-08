<script lang="ts">
	import { t } from '../../i18n.svelte';
	import Modal from './Modal.svelte';

	let {
		onSave,
		onClose
	}: {
		onSave: (current: string, next: string) => boolean;
		onClose: () => void;
	} = $props();

	let current = $state('');
	let next = $state('');

	function save() {
		if (onSave(current, next)) {
			current = '';
			next = '';
			onClose();
		}
	}

	function keys(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Escape') onClose();
		else if (e.key === 'Enter') save();
	}
</script>

<Modal {onClose} label={t('pw.title', 'Change password')} title={t('pw.title', 'Change password')}>
	<input type="password" bind:value={current} maxlength="128" placeholder={t('pw.current', 'Current password')} onkeydown={keys} />
	<input type="password" bind:value={next} maxlength="128" placeholder={t('pw.new', 'New password (8+ characters)')} onkeydown={keys} />
	<button class="report-send" onclick={save}>{t('pw.save', 'Save password')}</button>
</Modal>
