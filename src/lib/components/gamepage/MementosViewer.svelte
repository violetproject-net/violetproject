<script lang="ts">
	import { t } from '../../i18n.svelte';
    import type { Memento } from '../../gamepage/mementos.svelte';
	import { onMount } from 'svelte';
	import { getGameContext } from '../../gamepage/context';
	import Modal from './Modal.svelte';
	import MementoCard from './MementoCard.svelte';
    import MementoLightbox from './MementoLightbox.svelte';

	const { mementos, locations } = getGameContext();
	let query = $state('');
	let sort: 'game' | 'name' | 'art'= $state('game');
	let selected: Memento | null = $state(null);
    let {
		onClose
	}: {
		onClose: () => void;
	} = $props();

	onMount(() => {
		void mementos.load();
	});
	$effect(() => {
		for (const memento of mementos.all) {
			if (memento.game) void locations.ensure(memento.game);
		}
	});
	let visible = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return mementos.unlockedList
			.filter((memento) => {
				if (!q) return true;
				const game = memento.game ? locations.gameName(memento.game) : '';
				return (
					memento.name.toLowerCase().includes(q) ||
					memento.desc.toLowerCase().includes(q) ||
					memento.cond.toLowerCase().includes(q) ||
					memento.art.toLowerCase().includes(q) ||
					game.toLowerCase().includes(q)
				);
			})
			.sort((a, b) => {
				if (sort === 'name') return a.name.localeCompare(b.name);
				if (sort === 'art') return a.art.localeCompare(b.art);
				return (
					locations.gameName(a.game || '').localeCompare(locations.gameName(b.game || '')) ||
					a.name.localeCompare(b.name)
				);
			});
	});
</script>

<Modal boxClass="shotview"
    {onClose}
	<div class="chat-log mementos-tab">
	<div class="sys">
		{t('mementos.count', 'Mementos', {
			n: mementos.count,
			total: mementos.all.length
		})} 
        
	</div> //clarifying i removed the counts from the text because i dont want people to go unlock all the ones they dont have immediately or more like not have pressure to do so

	<div class="shottools">
		<input
			bind:value={query}
			maxlength="40"
			placeholder={t('mementos.search', 'Search mementos…')}
			onkeydown={(e) => e.stopPropagation()}
		/>
		<select bind:value={sort} title={t('mementos.sort', 'Sort')} aria-label={t('mementos.sort', 'Sort')}>
			<option value="game">{t('mementos.byGame', 'Game')}</option>
			<option value="name">{t('mementos.byName', 'Name')}</option>
			<option value="art">{t('mementos.byArt', 'Art')}</option>
		</select>
	</div>

	{#if mementos.loading || !mementos.ready}
		<div class="sys">{t('mementos.loading', 'Loading mementos…')}</div>
	{:else if mementos.error && !mementos.all.length}
		<div class="sys">{t('mementos.error', 'Could not load mementos.')}</div>
	{:else if !mementos.all.length}
		<div class="sys">{t('mementos.noneDefined', 'No matches.')}</div>
	{:else if !visible.length}
		<div class="sys">
			{query.trim()
				? t('mementos.noMatches', 'No matches.')
				: t('mementos.none', 'No matches.')}
		</div>
	{/if}

	<div class="mementogrid">
		{#each visible as memento (memento.name)}
			<MementoCard {memento} onOpen={() => (selected = memento)} />
		{/each}
	</div>
</Modal>
{#if selected}
	<MementoLightbox memento={selected} onClose={() => (selected = null)} />
{/if}
