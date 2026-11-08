<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import PlayerName from './PlayerName.svelte';

	const { chat, locations } = getGameContext();

	let query = $state('');

	const where = (game: string, room: number) =>
		`${room ? `${locations.mapName(game, room)} · ` : ''}${locations.gameName(game)}`;
</script>

<div class="chat-log">
	<div class="sys">{t('players.lookupTitle', 'Player lookup')}</div>
	<div class="friendrow">
		<input
			bind:value={query}
			maxlength="22"
			placeholder={t('players.searchPlaceholder', 'Search players…')}
			onkeydown={(e) => {
				e.stopPropagation();
				if (e.key === 'Enter') chat.lookup(query);
			}}
		/>
		<button onclick={() => chat.lookup(query)}>{t('players.find', 'Find')}</button>
	</div>
	{#each chat.lookupResults as p, i (p.uid + '|' + i)}
		{@const here = chat.sitePresence(p.uid)}
		<div class="friendrow">
			<PlayerName player={p} />
			{#if here}
				<span class="modnote">{locations.mapName(here.game ?? '', here.room ?? 0)} · {locations.gameName(here.game ?? '')}</span>
			{/if}
		</div>
	{/each}
	<div class="sys">
		{t('players.onlineNowN', 'Online now ({n})', { n: chat.siteRoster.length })}
	</div>
	<div class="friendrow">
		<button onclick={() => chat.requestSiteRoster()}>{t('players.refresh', 'Refresh')}</button>
	</div>
	{#if !chat.siteRoster.length}
		<div class="sys">{t('players.nobodyOnline', 'Nobody online.')}</div>
	{/if}
	{#each chat.siteRoster as p, i (p.uid + p.game + p.room + '|' + i)}
		<div class="friendrow">
			<PlayerName player={p} />
			<span class="modnote">{where(p.game, p.room)}</span>
		</div>
	{/each}
</div>
