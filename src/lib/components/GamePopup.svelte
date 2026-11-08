<script lang="ts">
	import '../styles/popup.css';
	import '../styles/shared.css';
	import { t, currentLang } from '../i18n.svelte';
	import { formatGameDate, type GameDetails, type GameSlide } from '../gameDetails';
	import SlideShow from './popup/SlideShow.svelte';
	import { fade, fly, scale } from "svelte/transition";
    import { cubicOut, expoInOut, expoOut, quadOut, sineInOut, sineOut } from 'svelte/easing';
	import { animValue } from "../accessibility.ts";


	let {
		title,
		details,
		slides = [],
		playHref,
		onClose
	}: {
		title: string;
		details: GameDetails;
		slides?: GameSlide[];
		playHref: string;
		onClose: () => void;
	} = $props();

	let rows = $derived(
		(
			[
				['popup.madeBy', 'Made By:', details.madeBy],
				['popup.releasedOn', 'Released On:', formatGameDate(details.releasedOn, currentLang())],
				['popup.lastUpdate', 'Last Update:', details.lastUpdate && formatGameDate(details.lastUpdate, currentLang())],
				['popup.version', 'Version:', details.version],
				['popup.versionAuthors', 'Version Authors:', details.versionAuthors],
				['popup.status', 'Status:', details.status]
			] as const
		).filter((row) => row[2])
	);
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="vp-backdrop" onclick={onClose} role="presentation" transition:fade={{ duration: 250, easing: sineInOut }}>
	<div
		class="vp-box popupbox gamepopup"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label={t('popup.info', 'Game info')}
		transition:scale={{ start: 0.96, duration: animValue(250), opacity: 0.5, easing: quadOut }}
	>
		<div class="popuphead" transition:fly={{ y: 20, duration: animValue(300), delay: animValue(200) }}>
			<div class="popuptitle">
				<h1>{title}</h1>
			</div>
			<button class="vp-close" onclick={onClose} title={t('app.close', 'Close')} aria-label={t('app.close', 'Close')}>×</button>
		</div>
			{#if details.removalDate}
			<div class="popupnotice" style={"--notice-color: #e06b6b"} transition:fly|global={{ y: 20, duration: animValue(300), delay: animValue(300) }}>
				{#if details.removalDate.getTime() >= Date.now()}
					{ 
						t(
							'popup.removalNotice', 
							'This game will no longer be available for online play after {date}.', 
							{ date: new Intl.DateTimeFormat(currentLang(), {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit',
								hour: '2-digit',
								minute: '2-digit',
							}).format(details.removalDate) }) 
					}
				{:else}
					{
						t(
							'popup.gameRemoved', 
							'This game was removed from online play on {date}. You may still click "Play" to retreive your game saves.', 
							{ date: new Intl.DateTimeFormat(currentLang(), {
								year: 'numeric',
								month: '2-digit',
								day: '2-digit',
								hour: '2-digit',
								minute: '2-digit',
							}).format(details.removalDate) }) 
					}
				{/if}
			</div>
		{/if}
		<div class="popupgrid" transition:fly={{ y: 20, duration: animValue(500), delay: animValue(300), easing: expoOut }}>
			<div class="popupmain">
				<div class="popuppanel">
					<SlideShow {slides} alt={title} />
				</div>
				<a class="downloadlink" href={details.downloadPage}><h1>{t('popup.downloadItch', 'download the game on {dl}!', { dl: details.downloadLabel ?? 'itch.io' })}</h1></a>
			</div>
			<div class="popupside">
				<div class="popuppanel small">
					{#each rows as [key, fallback, value] (key)}
						<p>{t(key, fallback)} {value}</p>
					{/each}
				</div>
				<!-- TODO: free popups, to show to the user (Hey you are being redirected to another site, 
				are you absolutely fucking certain you want to go to that site buddy? You'll regret it, buddy!) -->
				<!-- jk jk by the way lol -->
				<a class="popupaction" href={ details.thirdPartySite?.playHref ?? playHref }>
					{#if details.thirdPartySite}
						{t('popup.playThirdParty', 'Play {game} on {site}', { game: title, site: details.thirdPartySite.siteName })}
					{:else}
						{t('popup.play', 'Play {game} on Violetproject', { game: title })}
					{/if}
				</a>
			</div>
		</div>
	</div>
</div>
