
<script lang="ts">
    import { getContext, onMount } from "svelte";
     import { refreshAll } from "$app/navigation";
     import GamePopup from "../lib/components/GamePopup.svelte";
     import CreditsPopup from "../lib/components/CreditsPopup.svelte";
     import { t, initI18n, setLang, langs, currentLang } from "../lib/i18n.svelte";
     import { homeGames, gameBySlug, sortMethods, type SortMethodType } from "../lib/games";
     import { gameDetails, gameSlides, getGameReleaseDate, getGameUpdateDate } from "../lib/gameDetails";
    import { fade, fly, scale } from "svelte/transition";
    import { cubicOut, expoInOut, expoOut, quadOut, sineInOut, sineOut } from 'svelte/easing';

     const { openLogin } = getContext<{ openLogin: () => void }>("authControl");

     let { data } = $props();
     let isLoggingOut = $state(false);
     let openGame: string | null = $state(null);
     let creditsOpen = $state(false);
     let onlineCounts: Record<string, number> = $state({});
     let featuredName = $state("");
     let sortMethod: SortMethodType = $state("dateAdded");
     let sortDescending: boolean = $state(true);
     let homeGamesFiltered = $derived.by(() => {
        // this is what happens when severe laziness
        // and frustration completel takes over
        let list = (() => {
            switch (sortMethod) {
                case "dateAdded":
                    // Man it is already sorted this way
                    return homeGames.slice(); // just a weird way to copy the array
                case "lastUpdate":
                    return homeGames.toSorted((a, b) => {
                        const gameA = gameDetails[a.slug];
                        const gameB = gameDetails[b.slug];

                        const dateA = getGameUpdateDate(gameA) || getGameReleaseDate(gameA);
                        const dateB = getGameUpdateDate(gameB) || getGameReleaseDate(gameB);
                        return dateB.getTime() - dateA.getTime();
                    });
                case "releaseDate":
                    return homeGames.toSorted((a, b) => {
                        const gameA = gameDetails[a.slug];
                        const gameB = gameDetails[b.slug];

                        const dateA = getGameReleaseDate(gameA);
                        const dateB = getGameReleaseDate(gameB);
                        return dateB.getTime() - dateA.getTime();
                    });
                case "name":
                    return homeGames.toSorted((a, b) => {
                        return a.name.localeCompare(b.name);
                    });
                case "authors":
                    return homeGames.toSorted((a, b) => {
                        // this is sort of botched, it will probably
                        // not sort in the way people expect it to
                        // (at least in some cases probably)
                        // just compares that string homeGamesand said string can
                        // literally be anything so if the behavior of
                        // this needs to be updated then Do so ,   :pwease:
                        const gameA = gameDetails[a.slug];
                        const gameB = gameDetails[b.slug];

                        if (!gameA.madeBy || !gameB.madeBy) {
                            return -99999999999;
                        }

                        return gameA.madeBy.localeCompare(gameB.madeBy);
                    });
                case "playerCount":
                    return homeGames.toSorted((a, b) => {
                        const onlineA = onlineCounts[a.slug] || 0;
                        const onlineB = onlineCounts[b.slug] || 0;

                        return onlineB - onlineA;
                    });
                default:
                    console.error(`[violetproject] Unaccounted for filter method ${sortMethod}`);
                    return homeGames;
            }
        })();

        if (!sortDescending) {
            list.reverse();
        }
        return list;
     });

    let intro = $state(true);

     $effect(() => {
         const slug = data?.featured?.slug ?? "";
         if (!slug) return;
         const fallback = data?.featured?.name || homeGames.find((g) => g.slug === slug)?.name || slug;
         featuredName = fallback;
         const lang = currentLang();
         let alive = true;
         void (async () => {
             const read = async (url: string) => {
                 try {
                     const r = await fetch(url, { cache: "no-store" });
                     if (!r.ok) return "";
                     const j = await r.json();
                     return j && typeof j.game === "string" ? j.game : "";
                 } catch {
                     return "";
                 }
             };
             const tr = await read(`/locations/${slug}_${encodeURIComponent(lang)}.json`);
             const base = tr ? "" : await read(`/locations/${slug}.json`);
             if (alive) featuredName = tr || base || fallback;
         })();
         return () => {
             alive = false;
         };
     });

     function statsUrl() {
         try {
             if (typeof location !== "undefined" && location.protocol === "https:") {
                 return `wss://${location.host}/connect/online`;
             }
         } catch {}
         return `ws://localhost:8001/connect/online`;
     }

    // reworked
    function fitCaption(node: HTMLElement, opts: { max?: number; min?: number } = {}) {
        const max = opts.max ?? 23;
        const min = opts.min ?? 10;
        let raf = 0;

        const measure = () => {
            const parent = node.parentElement;
            const available = parent ? parent.clientWidth : node.clientWidth;

            node.style.fontSize = `${max}px`;
            let size = max;

            if (node.scrollWidth > available) {
                let lo = min;
                let hi = max;
                while (lo < hi) {
                    const mid = Math.ceil((lo + hi) / 2);
                    node.style.fontSize = `${mid}px`;
                    if (node.scrollWidth <= available) 
                        lo = mid;
                    else 
                        hi = mid - 1;
                }
                size = lo;
            }

            node.style.fontSize = `${size}px`;
        };

        const schedule = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(measure);
        };

        measure();

        let ro: ResizeObserver | null = null;
        try {
            ro = new ResizeObserver(schedule);
            ro.observe(node.parentElement ?? node);
        } catch {}

        try {
            void document.fonts?.ready.then(measure); // re-measure after webfonts load
        } catch {}

        return {
            update() { measure(); },
            destroy() {
                cancelAnimationFrame(raf);
                try { ro?.disconnect(); } catch {}
            }
        };
    }
     let countsLive = $state(false);

     onMount(() => {
        // limbillion: This is a weird little fix for intro animations re-playing when the dom changes
        // like when you change the sorting option, if you sort immediately while loading
        // the site and you are still in the grace period you will still briefly see the intro start over,
        // but it curbs it at least a little bit
        
        setTimeout(() => {
            intro = false;
        }, 2500);
         void initI18n();
         let statsWs: WebSocket | null = null;
         let statsTimer: ReturnType<typeof setInterval> | null = null;
         const poll = () => {
             try {
                 if (statsWs && statsWs.readyState === 1) {
                     statsWs.send(JSON.stringify({ t: "online" }));
                 } else {
                     openStats();
                 }
             } catch {}
         };
         const openStats = () => {
             try { statsWs?.close(); } catch {}
             try {
                 const ws = new WebSocket(statsUrl());
                 statsWs = ws;
                 ws.onmessage = (ev) => {
                     let m: any;
                     try { m = JSON.parse(ev.data); } catch { return; }
                     if (!m || m.t !== "online") return;
                     const g = (m.games && typeof m.games === "object" ? m.games : {}) as Record<string, unknown>;
                     const next: Record<string, number> = {};
                     for (const [k, v] of Object.entries(g)) next[k] = Number(v) || 0;
                     onlineCounts = next;
                     countsLive = true;
                 };
                 ws.onclose = () => {
                     if (statsWs !== ws) return;
                     statsWs = null;
                     statsTimer = setTimeout(openStats, 15000);
                 };
                 ws.onerror = () => {
                     try { ws.close(); } catch {}
                 };
                 ws.onopen = () => poll();
             } catch {}
         };
         openStats();
         statsTimer = setInterval(poll, 20000);
         return () => {
             try { statsWs?.close(); } catch {}
             statsWs = null;
             if (statsTimer) clearInterval(statsTimer);
             statsTimer = null;
         };
     });

     async function handleLogout() {
         isLoggingOut = true;

         try {
             const response = await fetch("/api/auth/sign-out", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 credentials: "same-origin",
                 body: JSON.stringify({})
             });

             if (!response.ok) {
                 throw new Error(`Logout failed with status ${response.status}`);
             }

             await refreshAll();
         } catch (error) {
             console.error("Logout request failed", error);
         } finally {
             isLoggingOut = false;
         }
     }
</script>
<title>Violetproject</title>
<div class="auth-bar">
    {#if data.displayName}
        <span>{t('auth.loggedInAs', 'Logged in as {name}', { name: data.displayName })}</span>
    {:else}
        <span>{t('auth.notLoggedIn', 'Not logged in')}</span>
    {/if}
    {#if data.displayName}
        <button class="login-button" onclick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? t('auth.loggingOut', 'Logging out...') : t('auth.logOut', 'Log out')}
        </button>
    {:else}
        <button class="login-button" onclick={openLogin}>{t('auth.logIn', 'Log in')}</button>
    {/if}
</div>

<div class="top-left">
    <!-- its inside of a "top-left" element now so it displays in an array list -->
    <!-- so you can just add more dropdowns or things here without having -->
    <!-- to fiddle with the freaking css positioning and shit yourself-->
    <div class="lang-bar">
        <select value={currentLang()} onchange={(e) => setLang(e.currentTarget.value)} aria-label={t('home.language', 'Language')}>
            {#each langs() as l (l.code)}
                <option value={l.code}>{l.name}</option>
            {/each}
        </select>
    </div>
    <div class="lang-bar">
    <div class="sort">
        <select bind:value={sortMethod} aria-label={t('home.sortGames', 'Sort games')}>
            {#each sortMethods as method (method.value)}
                <option value={method.value}>{t(method.key, method.fallback)}</option>
            {/each}
        </select>
        <!-- this looks like fucking garbage! i apparently suck at graphic design so be my guest and find a better way to do it-->
        <button class="sort-btn" onclick={() => sortDescending = !sortDescending} aria-label={t('home.sortOrder', 'Sort order')}>
            <img src={sortDescending ? "img/home/descend.svg" : "img/home/ascend.svg"} alt=""/> 
        </button>
     </div>
    </div>
</div>

 <img class="vp-logo intro-fadein" src="img/home/violetproject.png" alt="">
    <b class="intro-fadein" style="margin-bottom: 5px;--intro-delay: 0.1s">{t('home.tagline1', 'A Yume Nikki fangame multiplayer hosting project currently in development')}</b>
    {#if data.featured?.slug}
        <b class="intro-fadein" style="margin-bottom: 5px;--intro-delay: 0.5s">{t('home.featured', "Today's featured ynfg:")} <a href={`./${data.featured.slug}`} style="color: #9e59f3">{featuredName || data.featured.name}</a></b>
    {/if}
    <div class="image-container">
        {#each homeGamesFiltered as g (g.slug)}
            <div class="caption-container" class:intro>
                <button type="button" class="tilebtn" onclick={() => (openGame = g.slug)} aria-label={g.name}>
                    <img src={`img/game/${g.slug}.png`} style="width: 150px; height: auto; image-rendering: pixelated;" alt="">
                </button>
                <p class="image-text" class:intro use:fitCaption>{g.name}</p>
                <p class="online-count" class:intro>{!countsLive ? t('home.onlineUnknown', 'online: …') : t('home.online', 'online: {n}', { n: onlineCounts[g.slug] ?? 0 })}</p>
            </div>
        {/each}
    </div>
    
    <div class="image-container-links intro-fadein" style="--intro-delay: 0.6s">
        <a href="https://discord.gg/nGWZyKe43C">
            <img src="img/home/discord.svg" alt="" />
            </a>
            <a href="https://ko-fi.com/violetsitas">
            <img src="img/home/kofi.svg" alt="" />
            </a>
            <a href="https://github.com/violetproject-net">
            <img src="img/home/github.svg" alt="" />
            </a>
            <a href="https://bsky.app/profile/violetproject.bsky.social">
            <img src="img/home/bsky.svg" alt="" />
            </a>
    </div>

    <div class="permsrow intro-fadein" style="--intro-delay: 0.7s">
        <button class="permstext">{t('home.perms', 'All games hosted with explicit authorization by the developers :3')}</button>
    </div>

    <div class="creditsrow intro-fadein" style="--intro-delay: 0.7s">
        <button type="button" class="creditstext" onclick={() => window.open('https://violetproject.net/privacy', '_blank')}>{t('home.privacy', 'Privacy Policy')}</button>
        <button type="button" class="creditstext" onclick={() => (creditsOpen = true)}>{t('home.credits', 'Credits :3')}</button>
    </div>

    {#if openGame && gameDetails[openGame]}
        <GamePopup
            title={gameBySlug(openGame)?.name ?? openGame}
            playHref={`/${openGame}`}
            details={gameDetails[openGame]}
            slides={gameSlides[openGame]}
            onClose={() => (openGame = null)}
        />
    {/if}
    <CreditsPopup open={creditsOpen} onClose={() => (creditsOpen = false)} />



<style>
:global(body, html) {
    user-select: text;
    padding-bottom: 800px;
    scrollbar-width: none;
    min-width: min-content;
    min-height: min-content;
    margin: 0;
    height: 100%;
    background-color: #0d0614;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: repeating-linear-gradient( -45deg, #0d0614 0px, #0d0614 5px, #25102f 25px, #25102f 11px, #0d0614 25px );
  }

::selection {
color: #dcbfff;
background-color: #8d30ff;
}

.vp-logo {
    width: 35%; 
    height: auto;
    margin-top: 40px; 
    image-rendering: pixelated; 
    user-select: none;
}

.intro-fadein {
    transition: opacity 1s;
    transition-delay: var(--intro-delay);

    @starting-style {
        opacity: 0;
    }
}

h1 {
    color: violet;
    font-family: 'BIZ UDGothic';
    letter-spacing: -0.02em;
    text-align: center;
    text-shadow: 2px 2px 5px #886e8a;
    user-select: none;
    font-weight: bolder;
    letter-spacing: -0.05em;
}
b {
    display: block;
    color: lavender;
    font-family: 'Josefin Sans', sans-serif;
    text-align: center;
    text-shadow: 2px 2px 5px #886e8a;
}
p {
    color: lavender;
    font-family: 'Josefin Sans', sans-serif;
    text-align: center;
    font-size: 25px;
    letter-spacing: -0.02em;
    stroke: lavenderblush;
    text-shadow: 2px 2px 5px #886e8a;
}
.top-left {
    position: fixed;
    top: 0.75rem;
    left: 1rem;
    z-index: 3;
    display: flex;
    align-items: center;
    flex-direction: column;

    gap: 6px;
}
.lang-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.lang-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    user-select: none;
}

.sort {
    display: flex;
    align-items: stretch;
    gap: 0; 
}

.lang-bar select {
    background: #24102f;
    color: lavender;
    border: 2px solid #c084fc;
    padding: 0.35rem 0.5rem;
    font-family: 'Josefin Sans', sans-serif;
    font-size: 14px;
    cursor: pointer;
    height: 36px;
    box-sizing: border-box;
}

.sort .sort-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #24102f;
    border: 2px solid #c084fc;
    border-left: none;
    padding: 2px 6px;
    margin: 0;
    height: 36px;
    min-width: 42px;
    box-sizing: border-box;
    cursor: pointer;
}

.sort .sort-btn img {
    height: 24px;
    width: auto;
    display: block;
}
.auth-bar {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    width: 100%;
    user-select: none;
    box-sizing: border-box;
    padding: 0.75rem 1rem;
    color: lavender;
    font-family: 'Josefin Sans', sans-serif;
}
.auth-bar span {
    font-size: 1rem;
}
.login-button {
    border: 2px solid #c084fc;
    border-radius: 0;
    padding: 0.5rem 0.9rem;
    background: #7e22ce;
    color: white;
    cursor: pointer;
}
.image-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 15px;
    user-select: none;
}


.image-container img {
        max-width: 100%;
        height: auto;
    }


.image-container-links {
    position: fixed;
    bottom: 50px;
    left: 50%;
    z-index: 1;
    display: flex;
    justify-content: center;
    transform: translateX(-50%);
    user-select: none;
}
    .image-container-links img {
        height: 60px;
        width: auto;
        padding: 10px;
    }
.caption-container {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    width: 150px;
    flex-shrink: 0;
    user-select: none;
}
.caption-container.intro {
    /* for special easing you have to do this Sizuku ass nonsense manually */
    /* https://easings.net is the best site ever */
    transition: opacity 1s cubic-bezier(0.33, 1, 0.68, 1), translate 1s cubic-bezier(0.33, 1, 0.68, 1);
    /* sibling-index is brand new so it probably might not work on some random ass browsers */
    /* but at the moment it is baseline in all the major browsers so who cares for now zzz */
    transition-delay: calc(0.02s * sibling-index());

    @starting-style {
        opacity: 0;
        translate: 0 8px;
    }
}

@media (prefers-reduced-motion: reduce) {
    .caption-container.intro {
        /* only drop fading in, as far as i know this is more liable */
        transition-property: opacity;
    }
}
    .tilebtn {
        display: block;
        background: none;
        border: 0;
        padding: 0;
        cursor: pointer;
    }
    .permsrow {
        position: fixed;
        bottom: 32px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        margin: 0;
        padding-bottom: 8px;
        z-index: 1;
    }
    .permstext {
        background: none;
        border: 0;
        padding: 0;
        color: lavender;
        font-family: 'Josefin Sans', sans-serif;
        font-size: 20px;
    }
    .creditsrow {
        display: flex;      
        gap: 10px;     
        position: fixed;
        bottom: 5px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        margin: 0;
        padding-bottom: 8px;
        z-index: 1;
    }

    .creditstext {
        background: none;
        border: 0;
        padding: 0;
        cursor: pointer;
        color: #9e59f3;
        font-family: 'Josefin Sans', sans-serif;
        font-size: 20px;
        font-weight: bolder;
    }

    .caption-container img {
        display: block;
        width: 150px;
        height: auto;
        max-width: none;
    }


    .caption-container .image-text {
        margin: 0;
        text-align: center;
        white-space: nowrap;
        font-size: 23px;
    }
    .caption-container .online-count {
        margin: 0;
        text-align: center;
        font-size: 14px;
        opacity: 0.8;
    }

    .caption-container .image-text.intro {
        transition: opacity 1s cubic-bezier(0.33, 1, 0.68, 1);
        /* sibling-index is brand new so it probably might not work on some random ass browsers */
        /* but at the moment it is baseline in all the major browsers so who cares for now zzz */
        transition-delay: calc(0.1s + (0.02s * sibling-index()));

        @starting-style {
            opacity: 0;
        }
    }

    .caption-container .online-count.intro {
        transition: opacity 1s cubic-bezier(0.33, 1, 0.68, 1);
        /* sibling-index is brand new so it probably might not work on some random ass browsers */
        /* but at the moment it is baseline in all the major browsers so who cares for now zzz */
        transition-delay: calc(0.2s + (0.02s * sibling-index()));

        @starting-style {
            opacity: 0;
        }
    }

    .login-button {
        background-color: violet;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px;
        margin-bottom: 10px;
        margin-left: 20px;
    }
    span {
        margin-top: -10px;
    color: lavender;
    font-family: 'Josefin Sans', sans-serif;
    letter-spacing: -0.02em;
    stroke: lavenderblush;
    text-shadow: 2px 2px 5px #886e8a;
    }
</style>
