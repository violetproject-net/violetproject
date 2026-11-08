const env = process.env;
import { discordAllowed, handoffCodes, HANDOFF_TTL, pendingStates, randomToken } from '../../_guard';
import type { RequestHandler } from './$types';

function esc(v: string) {
	return String(v)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function page(title: string, body: string) {
	const fonts =
		'<link rel="preconnect" href="https://fonts.googleapis.com">' +
		'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
		'<link href="https://fonts.googleapis.com/css2?family=BIZ+UDGothic:wght@400;700&family=Josefin+Sans:wght@400;600;700&display=swap" rel="stylesheet">';
	const css = [
		'*{box-sizing:border-box}',
		'html,body{min-height:100%}',
		'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;',
		'background-color:#0d0614;',
		'background:repeating-linear-gradient(-45deg,#0d0614 0px,#0d0614 5px,#25102f 25px,#25102f 11px,#0d0614 25px);',
		"color:lavender;font-family:'Josefin Sans',sans-serif;font-size:15px;text-align:center;",
		'letter-spacing:-.02em;text-shadow:2px 2px 5px #886e8a;padding:24px}',
		'.box{width:100%;max-width:560px;padding:22px 24px;text-align:center;user-select:text;',
		'background:#24102f;color:#ecd5e3;border:1px solid #c589fa;border-radius:.25rem;',
		'box-shadow:8px 8px 0 #0d0614}',
		"h1{margin:0 0 4px;color:violet;font-family:'BIZ UDGothic',sans-serif;font-size:26px;",
		'font-weight:700;letter-spacing:-.05em;text-shadow:2px 2px 5px #886e8a;user-select:none}',
		"h2{margin:0 0 16px;color:#c589fa;font-family:'Josefin Sans',sans-serif;",
		'font-size:18px;font-weight:600;letter-spacing:-.02em}',
		'p{margin:12px 0;line-height:1.5;font-size:15px}',
		'p b{display:inline}',
		'b{color:lavender;font-weight:700}',
		'.hint{margin-top:14px;font-size:13px;opacity:.65}',
		'.code{margin:16px auto;padding:12px 14px;border:1px solid #c589fa;border-radius:.25rem;',
		'background:#0d0614;color:#ecd5e3;font:16px ui-monospace,Consolas,monospace;',
		'letter-spacing:0;text-shadow:none;user-select:all;word-break:break-all}',
		'button{cursor:pointer;padding:8px 18px;border:2px solid #c084fc;border-radius:.25rem;',
		"background:#c589fa;color:#000;font:700 15px 'Josefin Sans',sans-serif;",
		'letter-spacing:-.02em;text-shadow:none}',
		'button:hover{background:#d8a6ff}',
		'a{color:#c589fa;text-shadow:none}'
	].join('');
	const script =
		'var b=document.getElementById("copy");' +
		'if(b){b.onclick=function(){var t=document.getElementById("code").textContent.trim();' +
		'if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}' +
		'b.textContent="Copied";};}';
	const html =
		'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
		fonts +
		'<title>' +
		esc(title) +
		' - VIOLETADMIN</title><style>' +
		css +
		'</style></head><body><div class="box"><h1>VIOLETADMIN</h1><h2>' +
		esc(title) +
		'</h2>' +
		body +
		'</div><script>' +
		script +
		'</script></body></html>';
	return new Response(html, {
		headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code') || '';
	const state = url.searchParams.get('state') || '';
	const discordError = url.searchParams.get('error') || '';
	const clientId = String(env.YNO_DESKTOP_DISCORD_CLIENT_ID || '').trim();
	const clientSecret = String(env.YNO_DESKTOP_DISCORD_CLIENT_SECRET || '').trim();
	if (!clientId || !clientSecret) {
		return page(
			'Not configured',
			'<p>Set <b>YNO_DESKTOP_DISCORD_CLIENT_ID</b> and <b>YNO_DESKTOP_DISCORD_CLIENT_SECRET</b> in the server env, then try again.</p>'
		);
	}
	if (discordError) {
		return page('Login cancelled', '<p>Discord reported: ' + esc(discordError) + '.</p>');
	}
	if (!state || !pendingStates.has(state)) {
		return page('Login expired', '<p>That login link is no longer valid. Start again from the app.</p>');
	}
	pendingStates.delete(state);
	if (!code) return page('Login failed', '<p>Discord did not return a code.</p>');

	const redirectUri = (
		String(env.YNO_DESKTOP_PUBLIC_URL || '')
			.trim()
			.replace(/\/+$/, '') || url.origin
	) + '/api/desktop/discord/callback';
	let accessToken = '';
	try {
		const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri
			}),
			signal: AbortSignal.timeout(15000)
		});
		if (!tokenRes.ok) {
			return page(
				'Login failed',
				'<p>Discord rejected the code exchange (' + tokenRes.status + '). Try again from the app.</p>'
			);
		}
		const tok = (await tokenRes.json()) as { access_token?: string };
		accessToken = String(tok.access_token || '');
	} catch {
		return page('Login failed', '<p>Could not reach Discord. Check the server and try again.</p>');
	}
	if (!accessToken) return page('Login failed', '<p>Discord returned no access token.</p>');

	let discordId = '';
	let discordName = '';
	try {
		const meRes = await fetch('https://discord.com/api/users/@me', {
			headers: { authorization: 'Bearer ' + accessToken },
			signal: AbortSignal.timeout(15000)
		});
		if (!meRes.ok) {
			return page('Login failed', '<p>Could not read your Discord profile (' + meRes.status + ').</p>');
		}
		const me = (await meRes.json()) as { id?: string; username?: string; global_name?: string };
		discordId = String(me.id || '');
		discordName = String(me.global_name || me.username || '').slice(0, 60);
	} catch {
		return page('Login failed', '<p>Could not reach Discord.</p>');
	}

	if (!discordAllowed(discordId)) {
		return page(
			'Not allowed',
			'<p>Your Discord account (' +
				esc(discordName) +
				') is not authorized.</p><p class="hint">Ask the server owner to add your Discord user ID (' +
				esc(discordId) +
				') to YNO_DESKTOP_DISCORD_IDS.</p>'
		);
	}

	const handoff = randomToken(24);
	handoffCodes.set(handoff, { discordId, name: discordName, at: Date.now() });
	const ttlMin = Math.round(HANDOFF_TTL / 60000);
	return page(
		'Authorized',
		'<p>Welcome, ' +
			esc(discordName) +
			'.</p><p>Paste this code into VIOLETADMIN to continue:</p><div class="code" id="code">' +
			esc(handoff) +
			'</div><p><button id="copy">Copy code</button></p><p class="hint">Single use, expires in ' +
			ttlMin +
			' minutes.</p>'
	);
};
