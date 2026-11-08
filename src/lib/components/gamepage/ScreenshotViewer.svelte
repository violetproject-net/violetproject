<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { fmtShotTs } from '../../gamepage/format';
	import type { Shot } from '../../gamepage/types';
	import { getGameContext } from '../../gamepage/context';
	import Modal from './Modal.svelte';
	import ShotCard from './ShotCard.svelte';

	let {
		shots,
		onClose,
		onOpen,
		onSend,
		onDelete
	}: {
		shots: Shot[];
		onClose: () => void;
		onOpen: (shot: Shot) => void;
		onSend: (id: number) => void;
		onDelete: (id: number) => void;
	} = $props();

	const { locations } = getGameContext();

	let query = $state('');
	let sort: 'new' | 'old' | 'game' | 'map' = $state('new');

	let visible = $derived(
		shots
			.filter((s) => {
				const q = query.trim().toLowerCase();
				if (!q) return true;
				return (
					s.map.toLowerCase().includes(q) ||
					s.game.toLowerCase().includes(q) ||
					locations.gameName(s.game).toLowerCase().includes(q) ||
					fmtShotTs(s.ts).toLowerCase().includes(q)
				);
			})
			.sort((a, b) => {
				if (sort === 'old') return a.ts - b.ts || a.id - b.id;
				if (sort === 'game') return locations.gameName(a.game).localeCompare(locations.gameName(b.game)) || b.ts - a.ts;
				if (sort === 'map') return (a.map || '').localeCompare(b.map || '') || b.ts - a.ts;
				return b.ts - a.ts || b.id - a.id;
			})
	);
</script>

<Modal
	{onClose}
	label={t('shots.viewerAria', 'Screenshot viewer')}
	title={t('shots.viewerTitle', 'Screenshots ({n})', { n: visible.length })}
	boxClass="shotview"
>
	<div class="shottools">
		<input
			bind:value={query}
			maxlength="40"
			placeholder={t('shots.search', 'Search map, game, date…')}
			onkeydown={(e) => e.stopPropagation()}
		/>
		<select bind:value={sort} title={t('shots.sort', 'Sort')} aria-label={t('shots.sort', 'Sort')}>
			<option value="new">{t('shots.newest', 'Newest')}</option>
			<option value="old">{t('shots.oldest', 'Oldest')}</option>
			<option value="game">{t('shots.byGame', 'Game')}</option>
			<option value="map">{t('shots.byMap', 'Map')}</option>
		</select>
	</div>
	{#if !visible.length}
		<div class="sys">{t('shots.noMatches', 'No matches.')}</div>
	{/if}
	<div class="shotgrid wide">
		{#each visible as s (s.id)}
			<ShotCard shot={s} onOpen={() => onOpen(s)} onSend={() => onSend(s.id)} onDelete={() => onDelete(s.id)} />
		{/each}
	</div>
</Modal>
