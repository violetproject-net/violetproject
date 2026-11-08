<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import { richText, shotIdsIn, shotUrl } from '../../gamepage/format';
	import type { ChatMsg, ChatTab } from '../../gamepage/types';
	import PlayerName from './PlayerName.svelte';
	import MessageMeta from './MessageMeta.svelte';

	let {
		m,
		tab,
		onOpenImage
	}: {
		m: ChatMsg;
		tab: ChatTab;
		onOpenImage: (src: string) => void;
	} = $props();

	const { settings, chat } = getGameContext();

	const canSee = () => chat.canSeeShot(m.uid, m.name);
	let rowStyle = $derived(m.ping ? `background-color:${settings.pingColor}` : '');
	let shotIds = $derived(shotIdsIn(m.text));

	const EMOJI_CODE = /:([a-zA-Z][a-zA-Z0-9_-]*):/g;
	const ONLY_EMOJI = /^\s*(?::[a-zA-Z][a-zA-Z0-9_-]*:\s*)+$/;

	function embedEmojis(html: string) {
		return html.replace(
			EMOJI_CODE,
			(token, name) =>
				`<img class="emoji" src="/img/emoji/${name}.webp" alt="${token}" loading="lazy" onerror="this.replaceWith(this.alt)" />`
		);
	}

	let body = $derived(embedEmojis(richText(m.text, canSee)));
	let bodyInline = $derived(embedEmojis(richText(m.text, canSee, false)));
	let onlyEmoji = $derived(ONLY_EMOJI.test(m.text));
</script>

{#if m.sys}
	<div class="sys">{m.text}</div>
{:else if settings.chatLayout === 'stacked'}
	<div class="msg stacked" class:ping={m.ping} class:divided={settings.dividers} class:announce={m.announce} class:emoji-only={onlyEmoji} style={rowStyle}>
		<div class="msghead"><PlayerName player={m} message={m.text} /><MessageMeta {m} {tab} /></div>
		<span>{@html body}</span>
	</div>
{:else}
	<div class="msg" class:ping={m.ping} class:divided={settings.dividers} class:announce={m.announce} class:emoji-only={onlyEmoji} style={rowStyle}><PlayerName player={m} message={m.text} /><span>{@html bodyInline}</span><MessageMeta {m} {tab} /></div>
	{#if shotIds.length}
		<div class="msgshots">
			{#each shotIds.slice(0, 1) as id (id)}
				{#if canSee()}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
					<img
						class="shot"
						loading="lazy"
						src={shotUrl(id)}
						alt={t('shots.alt', 'screenshot')}
						onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
						onclick={() => onOpenImage(shotUrl(id))}
					/>
				{:else}
					<span class="shot-hidden">{t('shots.hidden', '[screenshot]')}</span>
				{/if}
			{/each}
		</div>
	{/if}
{/if}
