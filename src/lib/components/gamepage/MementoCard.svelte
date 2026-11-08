<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import type { Memento } from '../../gamepage/mementos.svelte';
	import MementoArt from './MementoArt.svelte';
	let {
		memento,
		onOpen
	}: {
		memento: Memento;
		onOpen: () => void;
	} = $props();
	const { locations } = getGameContext();
</script>

<button
	class="mementocard"
	type="button"
	onclick={onOpen}
	title={t('mementos.open', '{name}', { name: memento.name })}
	aria-label={t('mementos.open', 'View {name}', { name: memento.name })}
>
	<MementoArt {memento} size={111} />
	<span class="mementoname">{memento.name}</span>
	{#if memento.game}
		<span class="mementogame">{locations.gameName(memento.game)}</span>
		<span class="mementogame">{memento.art}</span>
	{/if}
</button>