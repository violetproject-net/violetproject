<script lang="ts">
	import '../styles/popup.css';
	import '../styles/shared.css';
	import { t } from '../i18n.svelte';
    import { fade, fly, scale } from "svelte/transition";
    import { cubicOut, expoInOut, expoOut, quadOut, sineInOut, sineOut } from 'svelte/easing';
	import { animValue } from "../accessibility.ts";

	let { onClose }: { onClose: () => void } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="vp-backdrop" onclick={onClose} role="presentation" transition:fade={{ duration: 250, easing: sineInOut }}>
	<div
		class="vp-box popupbox"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label={t('guest.title', 'Guest Limitations')}
		transition:scale={{ start: 0.96, duration: animValue(250), opacity: 0.5, easing: quadOut }}
	>
		<div class="popuphead" transition:fly={{ y: 20, duration: animValue(300), delay: animValue(200) }}>
			<div class="popuptitle">
				<h1>{t('guest.title', 'Guest Limitations')}</h1>
			</div>
			<button class="vp-close" onclick={onClose} title={t('app.close', 'Close')} aria-label={t('app.close', 'Close')}>×</button>
		</div>
		<div class="popupcontent" transition:fly={{ y: 20, duration: animValue(500), delay: animValue(300), easing: expoOut }}>
		<b>{t('guest.1', "You are playing as a Guest. Guest accounts are limited in various ways, including but not limited to...")}</b>
		<br>
		<b>{t('guest.2', "Location names")}</b>
		<br>
		<b>{t('guest.3', "Chat function")}</b>
		<br>
		<b>{t('guest.4', "Custom name color")}</b>
		<br>
		<b>{t('guest.5', "Saved settings and save files")}</b>
		<br>
		<b>{t('guest.6', "Screenshot function and more")}</b>
		<br>
		<b>{t('guest.7', "If you'd like to use these features, right click the top right of the page and select Log In, then register an account!")}</b>
		</div>
	</div>
</div>