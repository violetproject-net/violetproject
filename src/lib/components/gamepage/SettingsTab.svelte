<script lang="ts">
	import { t, langs, currentLang, setLang } from '../../i18n.svelte';
	import { getGameContext } from '../../gamepage/context';
	import { LIMITS } from '../../gamepage/settings.svelte';
	import type { SettingsTab } from '../../gamepage/types';
	import SettingRow from './SettingRow.svelte';
	import Stepper from './Stepper.svelte';
	import RulesPopup from '../RulesPopup.svelte'

	let {
		tab,
		savedMessage,
		onSave,
		onChangePassword,
		openRulesPopup
	}: {
		tab: SettingsTab;
		/** message after pressing save ("Saved 6:77 PM", "login required") */
		savedMessage: string;
		onSave: () => void;
		onChangePassword: () => void;
		openRulesPopup: () => void;
	} = $props();

	const { settings } = getGameContext();
</script>

<div class="chat-log">
	{#if tab === 'audio'}
		<SettingRow label={t('settings.pingSound', 'Ping sound')}>
			<select bind:value={settings.pingSound}>
				{#each settings.pingSounds as s (s.file)}
					<option value={s.file}>{s.label}</option>
				{/each}
			</select>
		</SettingRow>
		<SettingRow label={t('settings.pingVolume', 'Ping volume')}>
			<input type="range" min={LIMITS.pingVolume[0]} max={LIMITS.pingVolume[1]} bind:value={settings.pingVolume} />
			<b>{settings.pingVolume}</b>
		</SettingRow>
		<SettingRow label={t('settings.mutePings', 'Mute pings')}>
			<input type="checkbox" bind:checked={settings.mutePings} />
		</SettingRow>
		<SettingRow label={t('settings.musicVolume', 'Music volume')}>
			<input type="range" min={LIMITS.musicVolume[0]} max={LIMITS.musicVolume[1]} bind:value={settings.musicVolume} />
			<b>{settings.musicVolume}</b>
		</SettingRow>
		<SettingRow label={t('settings.sfxVolume', 'SFX volume')}>
			<input type="range" min={LIMITS.sfxVolume[0]} max={LIMITS.sfxVolume[1]} bind:value={settings.sfxVolume} />
			<b>{settings.sfxVolume}</b>
		</SettingRow>
		<SettingRow label={t('settings.mutePlayerSounds', 'Mute player sounds')}>
			<input type="checkbox" bind:checked={settings.mutePlayerSounds} />
		</SettingRow>
	{:else if tab === 'scale'}
		<Stepper label={t('settings.chatFontSize', 'Chat font size')} bind:value={settings.chatFont} min={LIMITS.chatFont[0]} max={LIMITS.chatFont[1]} unit="px" />
		<Stepper label={t('settings.buttonSize', 'Button size')} bind:value={settings.btnSize} min={LIMITS.btnSize[0]} max={LIMITS.btnSize[1]} unit="px" />
		<Stepper label={t('settings.chatWidth', 'Chat width')} bind:value={settings.chatWidth} min={LIMITS.chatWidth[0]} max={LIMITS.chatWidth[1]} unit="%" />
		<Stepper label={t('settings.chatWidthMobile', 'Chat width (Mobile)')} bind:value={settings.chatWidthMobile} min={LIMITS.chatWidthMobile[0]} max={LIMITS.chatWidthMobile[1]} unit="%" />
		<Stepper label={t('settings.statusFontSize', 'Status font size')} bind:value={settings.statusFont} min={LIMITS.statusFont[0]} max={LIMITS.statusFont[1]} unit="px" />
		<Stepper label={t('settings.screenshotSize', 'Screenshot size')} bind:value={settings.shotSize} min={LIMITS.shotSize[0]} max={LIMITS.shotSize[1]} step={20} unit="px" />
		<Stepper label={t('settings.screenshotScale', 'Screenshot scale factor')} bind:value={settings.shotScale} min={LIMITS.shotScale[0]} max={LIMITS.shotScale[1]} unit="x" />
	{:else if tab === 'layout'}
		<SettingRow label={t('settings.chatLayout', 'Chat layout')}>
			<select bind:value={settings.chatLayout}>
				<option value="inline">{t('settings.layoutInline', 'Inline')}</option>
				<option value="stacked">{t('settings.layoutStacked', 'Stacked')}</option>
			</select>
		</SettingRow>
		<SettingRow label={t('settings.showScreenshots', 'Show screenshots')}>
			<select bind:value={settings.shotVisibility}>
				<option value="all">{t('settings.shotEveryone', 'Everyone')}</option>
				<option value="friends">{t('settings.shotFriends', 'Friends only')}</option>
				<option value="none">{t('settings.shotHidden', 'Hidden')}</option>
			</select>
		</SettingRow>
		<SettingRow label={t('settings.timestamps', 'Timestamps')}>
			<select bind:value={settings.timeFmt}>
				<option value="24h">{t('settings.time24', '24 hour')}</option>
				<option value="12h">{t('settings.time12', '12 hour')}</option>
				<option value="off">{t('settings.timeOff', 'Off')}</option>
			</select>
		</SettingRow>
		<SettingRow label={t('settings.showGameGlobal', 'Show game in Global')}>
			<input type="checkbox" bind:checked={settings.showGame} />
		</SettingRow>
		<SettingRow label={t('settings.showMapGlobal', 'Show map in Global')}>
			<input type="checkbox" bind:checked={settings.showMapGlobal} />
		</SettingRow>
		<SettingRow label={t('settings.showMapGame', 'Show map in Game chat')}>
			<input type="checkbox" bind:checked={settings.showMap} />
		</SettingRow>
		<SettingRow label={t('settings.showWhere', 'Show location row')}>
			<input type="checkbox" bind:checked={settings.showWhere} />
		</SettingRow>
		<SettingRow label={t('settings.dividers', 'Message dividers')}>
			<input type="checkbox" bind:checked={settings.dividers} />
		</SettingRow>
		<Stepper label={t('settings.dividerPx', 'Divider thickness')} bind:value={settings.dividerPx} min={LIMITS.dividerPx[0]} max={LIMITS.dividerPx[1]} unit="px" />
		<SettingRow label={t('settings.friendDividers', 'Friends list dividers')}>
			<input type="checkbox" bind:checked={settings.friendDividers} />
		</SettingRow>
		<Stepper label={t('settings.friendDividerPx', 'Friends divider thickness')} bind:value={settings.friendDividerPx} min={LIMITS.friendDividerPx[0]} max={LIMITS.friendDividerPx[1]} unit="px" />
	{:else} 
		<SettingRow label={t('settings.language', 'Language')}>
			<select value={currentLang()} onchange={(e) => setLang(e.currentTarget.value)}>
				{#each langs() as l (l.code)}
					<option value={l.code}>{l.name}</option>
				{/each}
			</select>
		</SettingRow>
		<SettingRow label={t('settings.engineScaling', 'Engine scaling')}>
			<select bind:value={settings.scaleMode}>
				<option value="nearest">{t('settings.scalingNearest', 'Nearest')}</option>
				<option value="bilinear">{t('settings.scalingBilinear', 'Bilinear')}</option>
				<option value="integer">{t('settings.scalingInteger', 'Integer')}</option>
			</select>
		</SettingRow>

        <!-- commenting this out because its highkey not even functional at the moment the button does nothing ive tested, once it's fixed maybe add back but honestly there might not be a point
        <SettingRow label={t('settings.enableNpcSync', 'Synced NPCs')}>
			<input type="checkbox" bind:checked={settings.doNpcSync} />
		</SettingRow>
        -->
		<SettingRow label={t('settings.nameColor', 'Name color')}>
			<input type="color" bind:value={settings.nameColor} />
		</SettingRow>
		<SettingRow label={t('settings.pingColor', 'Ping color')}>
			<input type="color" bind:value={settings.pingColor} />
		</SettingRow>
		<SettingRow label={t('settings.nametags', 'Nametags')}>
			<select bind:value={settings.nametagMode}>
				<option value="classic">{t('settings.nametagClassic', 'Classic')}</option>
				<option value="compact">{t('settings.nametagCompact', 'Long')}</option>
				<option value="none">{t('settings.nametagNone', 'None')}</option>
			</select>
		</SettingRow>
		<SettingRow label={t('settings.password', 'Password')}>
			<button onclick={onChangePassword}>{t('settings.change', 'Change…')}</button>
		</SettingRow>
		<SettingRow label={t('rules.title', 'Rules')}>
			<button onclick= {openRulesPopup}>
				{t('rules.review', 'Review rules…')}
			</button>
		</SettingRow>
	{/if}
	<div class="setrow">
		<button class="save-settings" onclick={onSave}>{t('settings.save', 'save settings')}</button>
	</div>
	{#if savedMessage}<div class="sys">{savedMessage}</div>{/if}

	
</div>
