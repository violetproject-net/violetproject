<script lang="ts">
	import { t } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import type { ChatTab, SettingsTab, TopTab } from '../../gamepage/types';

	let {
		topTab,
		chatTab,
		settingsTab,
		started,
		isTouch,
		onTop,
		onTab,
		onSettingsTab,
		onClear,
		onScreenshot,
        toggleFullscreen,
        onChatClick,
		onOpenMementos
	}: {
		topTab: TopTab;
		chatTab: ChatTab;
		settingsTab: SettingsTab;
		started: boolean;
		isTouch: boolean;
		onTop: (t: TopTab) => void;
		onTab: (t: ChatTab) => void;
		onSettingsTab: (t: SettingsTab) => void;
		onClear: () => void;
		onScreenshot: () => void;
        toggleFullscreen: () => void;
        onChatClick: () => void;
		onOpenMementos: () => void;
	} = $props();


	const { chat } = getGameContext();

	let anyUnread = $derived((chat.unread.game ?? 0) + (chat.unread.room ?? 0) + (chat.unread.site ?? 0) > 0);
</script>
<div class="chat-tabs sub">
	<button class="cam-button" onclick={onScreenshot} disabled={!started} title={t('tabs.shot', 'Take screenshot')} aria-label={t('tabs.shot', 'Take screenshot')}><img src="img/button/camera.svg"></button>
    <button class="cam-button" onclick={toggleFullscreen} disabled={!started} title={t('tabs.fullscreen', 'Toggle Fullscreen')} aria-label={t('tabs.fullscreen', 'Toggle Fullscreen')}><img src="img/button/fullscreen.svg"></button>
	<button class="cam-button" onclick={onOpenMementos} title={t('mementos.tab', 'Mementos')} aria-label={t('mementos.tab', 'Mementos')}><img src="img/button/mementos.svg"></button>
	</div>
<div class="chat-head">
	<div class="chat-tabs">
		<button class:active={topTab === 'chat'} class:unread={anyUnread} onclick={() => { onTop('chat'); onChatClick?.(); }}> {t('tabs.chat', 'Chat')} </button>
		<button class:active={topTab === 'players'} onclick={() => onTop('players')}>{t('tabs.players', 'Players')}</button>
		<button class:active={topTab === 'other'} onclick={() => onTop('other')}>{t('tabs.other', 'Other')}</button>
		<button class:active={topTab === 'settings'} onclick={() => onTop('settings')}>{t('tabs.settings', 'Settings')}</button>
	</div>
</div>

{#if topTab === 'chat'}
	<div class="chat-tabs sub">
		<button class:active={chatTab === 'room'} class:unread={(chat.unread.room ?? 0) > 0} onclick={() => {onTab('room'); onChatClick?.(); }}>{t('chat.tab.map', 'Map')}</button>
		<button class:active={chatTab === 'game'} class:unread={(chat.unread.game ?? 0) > 0} onclick={() => {onTab('game'); onChatClick?.(); }}>{t('chat.tab.game', 'Game')}</button>
		<button class:active={chatTab === 'site'} class:unread={(chat.unread.site ?? 0) > 0} onclick={() => {onTab('site'); onChatClick?.(); }}>{t('chat.tab.global', 'Global')}</button>
		<button class="chat-clear" onclick={onClear} title={t('chat.clearTitle', 'Clear your view')}>{t('chat.clear', 'Clear')}</button>
	</div>
{:else if topTab === 'players'}
	<div class="chat-tabs sub">
		<button class:active={chatTab === 'friends'} onclick={() => onTab('friends')}>
			{chat.incoming.length ? t('players.friendsTabN', 'Friends ({n})', { n: chat.incoming.length }) : t('players.friendsTab', 'Friends')}
		</button>
		<button class:active={chatTab === 'roster'} onclick={() => onTab('roster')}>{t('players.inMap', 'In Map')}</button>
		{#if chat.amAdmin}
			<button class:active={chatTab === 'lookup'} onclick={() => onTab('lookup')}>{t('players.lookupTab', 'Lookup')}</button>
		{/if}
	</div>
{:else if topTab === 'other'}
	<div class="chat-tabs sub">
		<button class:active={chatTab === 'shots'} onclick={() => onTab('shots')}>{t('shots.tab', 'Screenshots')}</button>
		<button class:active={chatTab === 'switch'} onclick={() => onTab('switch')}>{t('switch.tab', 'Switch Game')}</button>
		<button class:active={chatTab === 'saves'} onclick={() => onTab('saves')}>{t('saves.tab', 'Saves')}</button>
	</div>
{:else if topTab === 'settings'}
	<div class="chat-tabs sub">
		<button class:active={settingsTab === 'audio'} onclick={() => onSettingsTab('audio')}>{t('settings.tab.audio', 'Audio')}</button>
		<button class:active={settingsTab === 'scale'} onclick={() => onSettingsTab('scale')}>{t('settings.tab.scale', 'Scale')}</button>
		<button class:active={settingsTab === 'layout'} onclick={() => onSettingsTab('layout')}>{t('settings.tab.layout', 'Layout')}</button>
		<button class:active={settingsTab === 'misc'} onclick={() => onSettingsTab('misc')}>{t('settings.tab.misc', 'Misc')}</button>
	</div>
{/if}
{#if isTouch}
	<div class="chat-tabs sub controls-row">
		<button class:active={chatTab === 'controls'} onclick={() => onTab('controls')}>{t('tabs.controls', 'Controls')}</button>
	</div>
{/if}
