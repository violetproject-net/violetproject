<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import PlayerName from './PlayerName.svelte';

	const { chat } = getGameContext();
</script>

<div class="chat-log">
	<div class="sys">{t('players.hereNowN', 'Here now ({n})', { n: chat.roster.length })}</div>
	{#if !chat.roster.length}
		<div class="sys">{t('players.nobodyHere', 'Nobody here yet.')}</div>
	{/if}
	{#each chat.roster as p, i (p.uid + '|' + p.name + '|' + i)}
		<div class="friendrow">
			<PlayerName player={p} />
		</div>
	{/each}
</div>
