<script lang="ts">
    import { setContext, onMount } from "svelte";
    import { invalidateAll } from "$app/navigation";
    import { t, initI18n } from "../lib/i18n.svelte";


    const { children } = $props();
    
    let showLoginModal = $state(false);
    let username = $state("");
    let password = $state("");
    let errorMessage = $state("");
    let isLoading = $state(false);
    let isRegistering = $state(false);


    onMount(() => {
        void initI18n();
        if ("serviceWorker" in navigator && location.protocol === "https:") {
            const register = () => {
                navigator.serviceWorker.register("/sw.js").catch((error) => {
                    console.warn("service worker registration failed", error);
                });
            };
            if (document.readyState === "complete") register();
            else window.addEventListener("load", register, { once: true });
        }
    });

    setContext("authControl", {
        openLogin: () => { showLoginModal = true; },
        closeLogin: () => { showLoginModal = false; }
    });

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        errorMessage = "";
        isLoading = true;

        try {
            
            const endpoint = isRegistering ? "/api/auth/sign-up/email" : "/api/auth/sign-in/username";
            const body = isRegistering
                ? { username, password, name: username, email: `${username}@local.internal` }
                : { username, password };
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body)
            });
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                const message = result?.message ?? result?.error?.message;
                if (isRegistering && message === "Username is already taken") {
                    isRegistering = false;
                    errorMessage = "Username is already taken";
                } else {
                    errorMessage = message ?? (isRegistering ? "Unable to create account" : "Unable to sign in");
                }
            } else {
                await invalidateAll();
                closeLogin();
            }
        } catch (error) {
            console.error("Authentication request failed", error);
            errorMessage = isRegistering ? "Unable to create account" : "Unable to sign in";
        } finally {
            isLoading = false;
        }
        
    }

    function closeLogin() {
        showLoginModal = false;
        username = "";
        password = "";
        errorMessage = "";
        isRegistering = false;
    }

    
</script>


<div class="login">
    <main class="view">
        {@render children()}
    </main>
</div>


{#if showLoginModal}
<div class="loginbackground" role="presentation">
        <div class="logincontent" onclick={(event) => event.stopPropagation()} role="presentation">
            <div class="header">
                <button type="button" class="close-x" onclick={closeLogin}>&times;</button>
            </div>

            {#if errorMessage}
                <div class="error-banner">
                    <p>{errorMessage}</p>
                </div>
            {/if}

            <form onsubmit={handleSubmit}>
                <div class="input-group">
                    <label for="username">{t('auth.username', 'Username')}</label>
                    <input id="username" type="text" bind:value={username} required minlength="1" maxlength="22"
                        disabled={isLoading} placeholder={t('auth.usernamePlaceholder', 'Enter username')} />
                </div>

                <div class="input-group">
                    <label for="password">{t('auth.password', 'Password')}</label>
                    <input id="password" type="password" bind:value={password} required disabled={isLoading}
                        placeholder="••••••••" />
                </div>

                <button type="submit" class="submit-button" disabled={isLoading}>
                    {isLoading ? t('auth.loading', 'Loading...') : (isRegistering ? t('auth.register', 'Register Account') : t('auth.loginSubmit', 'Log In'))}
                </button>
            </form>
            <div class="modal-footer">
                <button type="button" class="toggle-mode-btn" onclick={() => isRegistering = !isRegistering} disabled={isLoading}>
                    {isRegistering ? t('auth.toLoginMode', 'Log into your account') : t('auth.toRegisterMode', 'Register an account')}
                </button>
            </div>
        </div>
</div>
{/if}

<style>
:global(body) {
    -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text; 
    color: lavender;
    font-family: 'Josefin Sans', sans-serif;
    text-align: center;
    font-size: 25px;
    letter-spacing: -0.02em;
    stroke: lavenderblush;
    text-shadow: 2px 2px 5px #886e8a;
}
::selection {
color: 9e59f3;
}
    .login {
        position: relative;
        min-height: 100vh;
        width: 100%;
    color: lavender;
    font-family: 'Josefin Sans', sans-serif;
    text-align: center;
    font-size: 25px;
    letter-spacing: -0.02em;
    stroke: lavenderblush;
    text-shadow: 2px 2px 5px #886e8a;
    }
    .view { width: 100%; }

    .loginbackground {
        position: fixed;
        inset: 0;
        z-index: 10;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgb(13 6 20 / 75%);
    }

    .logincontent {
        width: min(100%, 22rem);
        box-sizing: border-box;
        padding: 1.5rem;
        background: #24102f;
        color: #ecd5e3;
        box-shadow: 8px 8px 0 #0d0614;
        border-radius: 0.25rem;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .header h2 {
        margin: 0 0 1.25rem;
           color: lavender;
    font-family: 'Josefin Sans', sans-serif;
    text-align: center;
    font-size: 25px;
    letter-spacing: -0.02em;
    stroke: lavenderblush;
    text-shadow: 2px 2px 5px #886e8a;
    }

    .close-x {
        border: 0;
        background: transparent;
        color: #e9d5ff;
        cursor: pointer;
        font-size: 1.5rem;
        line-height: 1;
    }

    .input-group {
        display: grid;
        gap: 0.35rem;
        margin-bottom: 1rem;
    }

    .input-group input {
        box-sizing: border-box;
        width: 100%;
        padding: 0.65rem;
        background: #0d0614;
        color: #ecd5e3;
    }

    .submit-button,
    .toggle-mode-btn {
        padding: 0.65rem 0.9rem;
        cursor: pointer;
    }

    .submit-button {
        width: 100%;
        background: #c589fa;
        color: #ecd5e3;
    }

    .toggle-mode-btn {
        margin-top: 1rem;
        background: transparent;
        color: #e9d5ff;
    }

    .error-banner {
        margin-bottom: 1rem;
        color: #fca5a5;
    }

    .error-banner p {
        margin: 0;
        font-size: 0.9rem;
        text-align: left;
    }
</style>
