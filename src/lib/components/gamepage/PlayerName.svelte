<script lang="ts">
	import { getGameContext } from '../../gamepage/context';
	import type { NamedPlayer } from '../../gamepage/types';

	let {
		player,
		message
	}: {
		player: NamedPlayer & { uid?: string };
		message?: string;
	} = $props();

	const { settings, openMenu } = getGameContext();

	let style = $derived.by(() => {
		const c = player.color || (player.mine ? settings.nameColor : '');
		return c ? `color:${c}` : '';
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<b class="pname" oncontextmenu={(e) => openMenu(e, player.name, player.uid, message)} {style}>{player.name}{#if player.adm}<span class="adm" title="Admin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg></span>{/if}</b>
