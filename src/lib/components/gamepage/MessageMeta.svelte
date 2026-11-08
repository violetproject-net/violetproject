<script lang="ts">
	import { getGameContext } from '../../gamepage/context';
	import { fmtTime } from '../../gamepage/format';
	import type { ChatMsg, ChatTab } from '../../gamepage/types';

	let { m, tab }: { m: ChatMsg; tab: ChatTab } = $props();

	const { game, settings, locations } = getGameContext();
</script>

<span class="meta">{#if tab === 'game' && settings.showMap && (m.rm ?? 0) > 0}<span class="pmap">{locations.mapName(game, m.rm ?? 0)}</span>{/if}{#if settings.showGame && m.pg}<span class="pgame">{locations.gameName(m.pg)}</span>{/if}{#if tab === 'site' && settings.showMapGlobal && (m.rm ?? 0) > 0}<span class="pmap">{locations.mapName(m.pg || '', m.rm ?? 0)}</span>{/if}{#if settings.timeFmt !== 'off' && m.ts}<time>{fmtTime(m.ts, settings.timeFmt)}</time>{/if}</span>
