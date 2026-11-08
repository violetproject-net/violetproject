<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import type { Memento } from '../../gamepage/mementos.svelte';
	import Modal from './Modal.svelte';
	import MementoArt from './MementoArt.svelte';
	let {
		memento,
		onClose
	}: {
		memento: Memento;
		onClose: () => void;
	} = $props();
	const { locations } = getGameContext();
</script>

<Modal
	{onClose}
	label={t('mementos.viewerAria', 'Memento viewer')}
	title={memento.name}
	boxClass="mementobox"
>
	<div class="mementoview">
		<MementoArt {memento} size={296} />
		{#if memento.game}
			<div class="mementogame">{locations.gameName(memento.game)}</div>
		{/if}
		{#if memento.desc}
			<p class="mementodesc">{memento.desc}</p>
		{/if}
		{#if memento.cond}
			<p class="mementocond">{memento.cond}</p>
		{/if}
		{#if memento.art}
			<p class="mementocredit">{t('mementos.artBy', 'Created by {art}', { art: memento.art })}</p>
		{/if}
	</div>
</Modal>