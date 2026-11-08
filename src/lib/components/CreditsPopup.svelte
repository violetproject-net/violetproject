<script lang="ts">
	import '../styles/popup.css';
	import '../styles/shared.css';
	import { t } from '../i18n.svelte';
	import { fade, fly, scale } from "svelte/transition";
    import { cubicOut, expoInOut, expoOut, quadOut, sineInOut, sineOut } from 'svelte/easing';
	import { animValue } from "../accessibility.ts";

	let { open, onClose }: { open: boolean; onClose: () => void } = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="vp-backdrop" onclick={onClose} role="presentation" transition:fade={{ duration: 250, easing: sineInOut }}>
		<div
			class="vp-box popupbox"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-label={t('credits.title', 'Credits')}
			transition:scale={{ start: 0.96, duration: animValue(250), opacity: 0.5, easing: quadOut }}
		>
			<div class="popuphead" transition:fly={{ y: 20, duration: animValue(300), delay: animValue(200) }}>
				<div class="popuptitle">
					<h1>{t('credits.title', 'Credits')}</h1>
				</div>
				<button class="vp-close" onclick={onClose} title={t('app.close', 'Close')} aria-label={t('app.close', 'Close')}>×</button>
			</div>
			<div class="popupcontent" transition:fly={{ y: 20, duration: animValue(500), delay: animValue(300), easing: expoOut }}>
				<b>{t('credits.madeBy', 'Site made by Violet/violetsitas, Aura, and Zarkv')}</b>
				<br>
				<b>{t('credits.enginePre', 'Credits to')} <a href="https://github.com/ynoproject/ynoengine">YNOEngine</a> {t('credits.enginePost', 'for the base reference used by our modified engine')}</b>
				<br>
				<b>{t('credits.devThanks', 'To all the amazing developers who make the games we host, thank you for making this possible!!')}</b>
				<br>
				<b>{t('credits.supportThanks', "And to everyone who's supported this project, thank you for your support!!")}</b>
				<br>
				<b>{t('credits.contactPre', 'If you need to reach me, join the Violetproject')} <a href="https://discord.gg/mfWTxykvC4">{t('credits.discord', 'discord')}</a> {t('credits.contactPost', 'or message "contact@violetproject.net"')}</b>
				<br>
				<b>{t('credits.wip', "This is still a work in progress, but i'm excited to see where it will end up :3")}</b>
			</div>
		</div>
	</div>
{/if}
