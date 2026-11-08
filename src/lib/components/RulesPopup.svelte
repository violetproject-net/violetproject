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
		aria-label={t('rules.title', 'Rules')}
		transition:scale={{ start: 0.96, duration: animValue(250), opacity: 0.5, easing: quadOut }}
	>
		<div class="popuphead" transition:fly={{ y: 20, duration: animValue(300), delay: animValue(200) }}>
			<div class="popuptitle">
				<h1>{t('rules.title', 'Rules')}</h1>
			</div>
			<button class="vp-close" onclick={onClose} title={t('app.close', 'Close')} aria-label={t('app.close', 'Close')}>×</button>
		</div>
		<div class="popupcontent" transition:fly={{ y: 20, duration: animValue(500), delay: animValue(300), easing: expoOut }}>
		<b>{t('rules.1', "No toxicity, sexism, racism, or bigotry")}</b>
		<br>
		<br>
		<b>{t('rules.2', "Be respectful, don't cause unnecessary issues.")}</b>
		<br>
		<br>
		<b>{t('rules.3', "Be mindful about the things/topics you speak about in the chat. For example, do not talk about explicit NSFW content (gore, nudity, etc), and be careful about using slurs.")}</b>
		<br>
		<br>
		<b>{t('rules.4', "Avoid having political discussions in the chat")}</b>
		<br>
		<br>
		<b>{t('rules.5', "Do not use scripts or override game assets (or any other means) to")}</b>
		<ol>
			<li>{t('rules.5a', "facilitate displaying harmful or inappropriate content to other users of the site")}</li>
			<li>{t('rules.5b', "undermine the player experience of the website")}</li>
			<li>{t('rules.5c', "perform a DDoS attack on the site")}</li>
			<li>{t('rules.5d', "obtain unauthorized access to private user information")}</li>
			<li>{t('rules.5e', "obtain unauthorized access to parts of the site")}</li>
			<li>{t('rules.5f', "make unauthorized changes to the site or the Games it hosts")}</li>
		</ol>
		<br>
		<br>
		<b>{t('rules.6', "If someone is breaking these rules, report them ingame and/or through the mod-concerns channel in the Violetproject discord.")}</b>
		</div>
	</div>
</div>
 <style>
ol {
	align-self:left;
	text-align: left;
	font-size: -7;
}
	 
 </style>
