<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { downloadScreenshot } from '../../gamepage/screenshots';
	import type { Shot } from '../../gamepage/types';
	import Modal from './Modal.svelte';

	let {
		src,
		shot,
		scale,
		onClose
	}: {
		src: string;
		shot?: Shot;
		scale: number;
		onClose: () => void;
	} = $props();
</script>

<Modal {onClose} label={t('shots.viewerAria', 'Screenshot viewer')} boxClass="shotview">
	<img {src} alt={t('shots.alt', 'screenshot')} />
	<button class="report-download" onclick={() => downloadScreenshot(src, shot, scale)}>{t('shots.download', 'Download')}</button>
</Modal>
