<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { homeGames } from '../../games';

	let {
		counts,
		countsLive,
		onPick
	}: {
		counts: Record<string, number>;
		countsLive: boolean;
		onPick: (slug: string) => void;
	} = $props();
</script>

<div class="chat-log">
	<button class="save-settings" onclick={() => (window.location.href = '/')}>{t('switch.mainpage', 'Main Page')}</button>
	<div class="sys">{t('switch.title', 'Switch game')}</div>
	<div class="switchgrid">
		{#each homeGames as g (g.slug)}
			<div class="switchcell">
				<button onclick={() => onPick(g.slug)} aria-label={g.name}>
					<img src={`/img/game/${g.slug}.png`} alt={g.name} />
				</button>
				<span>{g.name}</span>
				<span>{!countsLive ? t('switch.onlineUnknown', 'online: …') : t('switch.online', 'online: {n}', { n: counts[g.slug] ?? 0 })}</span>
			</div>
		{/each}
	</div>
</div>
