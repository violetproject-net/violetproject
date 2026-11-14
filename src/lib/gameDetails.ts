import { currentLang } from './i18n.svelte';

export type GameDate = {
	day: number;
	month: number;
	year: number;
};

export type ThirdPartySite = {
	// actual link to the site, e.g. https://unconscious.online/play
	playHref: string,
	// human name of the site, e.g. Violetproject, Google, etc.
	siteName: string
}

export type GameDetails = {
	madeBy: string;
	releasedOn: GameDate;
	lastUpdate?: GameDate;
	version?: string;
	versionAuthors?: string;
	status: string;
	downloadPage: string;
	downloadLabel?: string;
	// for future use
	// mostly just added these so we can add links to third-party
	// sites, e.g. for when Collective Unconscious completes their
	// official website. this can also be used in similar future
	// situations, if any, but mostly just added this for user
	// convenience when this finally happens

	// if this game can only be played on a third-party site,
	// specify the actual link to the site here.
	thirdPartySite?: ThirdPartySite
	removalDate?: Date // Yeah I don't care
};

export type GameSlide = { src: string; alt?: string };

const dateFormats: Record<string, Intl.DateTimeFormat> = {};

export function formatGameDate(date: GameDate, locale: string = currentLang()): string {
	const d = new Date(date.year, date.month - 1, date.day);
	let loc = 'en';
	try {
		if (Intl.DateTimeFormat.supportedLocalesOf([locale]).length) loc = locale;
	} catch {}
	let fmt = dateFormats[loc];
	if (!fmt) {
		fmt = new Intl.DateTimeFormat(loc + '-u-ca-gregory-nu-latn', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		dateFormats[loc] = fmt;
	}
	return fmt.format(new Date(date.year, date.month-1, date.day));
}	

export function getGameUpdateDate(game: GameDetails): Date | null {
	if (!game.lastUpdate) {
		return null;
	}
	return new Date(game.lastUpdate.year, game.lastUpdate.month-1, game.lastUpdate.day);
}

export function getGameReleaseDate(game: GameDetails): Date {
	return new Date(game.releasedOn.year, game.releasedOn.month-1, game.releasedOn.day);
}

export const gameDetails: Record<string, GameDetails> = {
	loveyou: {
		madeBy: 'fvckingvisc3ra',
		releasedOn: { day: 3, month: 7, year: 2025 },
		lastUpdate: { day: 8, month: 2, year: 2026 },
		version: '0.03b',
		status: 'In development',
		downloadPage: 'https://visc3ra.itch.io/love-you-003b'
	},
	blackrain: {
		madeBy: 'Murasaki no Yume and the Black Rain Team',
		releasedOn: { day: 2, month: 8, year: 2024 },
		lastUpdate: { day: 12, month: 10, year: 2026 },
		version: '0.031 Patch 1',
		versionAuthors: 'CoolKid95',
		status: 'In development, Collaborative',
		downloadPage: 'https://acceleratingwind.itch.io/black-rain'
	},
	unaccomplished: {
		madeBy: 'Moucky2333',
		releasedOn: { day: 22, month: 12, year: 2023 },
		lastUpdate: { day: 22, month: 12, year: 2025 },
		version: 'oiii+',
		status: 'In development',
		downloadPage: 'https://moucky233.itch.io/unaccomplished'
	},
	yugennoyume: {
		madeBy: 'Moucky2333',
		releasedOn: { day: 2, month: 7, year: 2026 },
		lastUpdate: { day: 3, month: 7, year: 2026 },
		version: '0.00+',
		status: 'In development',
		downloadPage: 'https://moucky233.itch.io/yugen-no-yume'
	},
	lovedrains: {
		madeBy: 'fvckingvisc3ra',
		releasedOn: { day: 26, month: 6, year: 2026 },
		status: 'In development',
		downloadPage: 'https://visc3ra.itch.io/love-drains'
	},
	notedream: {
		madeBy: 'rosaregard, ZLD1, oliver, Moucky2333, and the Note Dream Team',
		releasedOn: { day: 31, month: 7, year: 2026 },
		lastUpdate: { day: 8, month: 11, year: 2026 },
		version: '0.001a',
		versionAuthors: 'vesi, rosaregard, oliver, and ZLD',
		status: 'In development, Collaborative',
		downloadPage: 'https://notedream-official.itch.io/note-dream'
	},
	deepdreams: {
		madeBy: 'noildoof',
		releasedOn: { day: 19, month: 10, year: 2020 },
		lastUpdate: { day: 17, month: 11, year: 2021 },
		version: '0.05',
		status: 'In development',
		downloadPage: 'https://www.pixiv.net/en/artworks/94202922',
		downloadLabel: 'pixiv'
	},
	scarynikki: {
		madeBy: 'rosaregard',
		releasedOn: { day: 10, month: 1, year: 2021 },
		lastUpdate: { day: 3, month: 4, year: 2026 },
		version: '0.4a++',
		status: 'In development',
		downloadPage: 'https://dragerasor.itch.io/scarynikki'
	},
	dotflow: {
		madeBy: 'lolrust',
		releasedOn: { day: 15, month: 2, year: 2009 },
		lastUpdate: { day: 27, month: 5, year: 2019 },
		version: '0.194',
		status: 'Complete',
		downloadPage: 'https://dotflow.wikidot.com/downloads',
		downloadLabel: 'wikidot'
	},
	cold: {
		madeBy: 'Mnn988',
		releasedOn: { day: 10, month: 2, year: 2022 },
		lastUpdate: { day: 27, month: 6, year: 2026 },
		version: 'COoo++',
		status: 'In development',
		downloadPage: 'https://mnn988.itch.io/lclodl'
	},
	represal: {
		madeBy: 'Mnn988',
		releasedOn: { day: 11, month: 3, year: 2021 },
		lastUpdate: { day: 11, month: 3, year: 2023 },
		version: '0.oWoREMAKE',
		status: 'In development',
		downloadPage:
			'https://www.mediafire.com/file/a3w6y25u9l0fubn/RepresaL+Ver.0.oWo.REMAKE_ENG.zip/file',
		downloadLabel: 'MediaFire'
	},
	yumetsushin: {
		madeBy: 'Pingupingn',
		releasedOn: { day: 21, month: 12, year: 2023 },
		lastUpdate: { day: 20, month: 12, year: 2024 },
		version: '0.01',
		status: 'In development',
		downloadPage: 'https://www.mediafire.com/file/mkvc8vzep4u0eg7',
		downloadLabel: 'MediaFire'
	},
	dreamgenie: {
		madeBy: 'TanDen___☄',
		releasedOn: { day: 19, month: 5, year: 2012 },
		lastUpdate: { day: 10, month: 12, year: 2022 },
		version: '2022m',
		status: 'In development',
		downloadPage: 'https://drive.google.com/drive/folders/1kSSCQ-ENZOKvrJt5UVSeeikyRgDOWx_a',
		downloadLabel: 'Google Drive'
	},
	amillusion: {
		madeBy: 'Team Compote',
		releasedOn: { day: 17, month: 2, year: 2019 },
		lastUpdate: { day: 12, month: 2, year: 2026 },
		version: '1.02',
		status: 'In development',
		downloadPage: 'https://www.mediafire.com/file/otk9imn1b2q1rto?action=check',
		downloadLabel: 'MediaFire'
},
	me: {
		madeBy: 'Isasapiens',
		releasedOn: { day: 28, month: 9, year: 2011 },
		version: '0.10 (RPG2K3)',
		status: 'Complete',
		downloadPage: 'https://www.mediafire.com/file/w6nlvlz4g85b64a/Me_V005.zip/file',
		downloadLabel: 'MediaFire'
},
    doorofthoughts: {
		madeBy: 'Isasapiens',
		releasedOn: { day: 4, month: 3, year: 2013 },
		status: 'Complete',
		downloadPage: 'https://www.mediafire.com/file/xd2mlcl6mhe25br/Project1.rar/file',
		downloadLabel: 'MediaFire'
	},
	somnium: {
		madeBy: 'Isasapiens',
		releasedOn: { day: 7, month: 4, year: 2012 },
		version: 'Gamma',
		status: 'Complete',
		downloadPage: 'https://www.dropbox.com/scl/fi/vujgx4ptqo5zx9waea4p3/Somnium-version-Gamma-2.rar?rlkey=l7vehhz36ou3f0hprt7fpdqia&e=1',
		downloadLabel: 'Dropbox'
	},
	remedy: {
		madeBy: 'Isasapiens',
		releasedOn: { day: 7, month: 4, year: 2012 },
		version: 'Alpha 3',
		status: 'Complete',
		downloadPage: 'https://www.mediafire.com/download/2nzxscequ1gwfd1/Remedy+ver+alpha+3.rar',
		downloadLabel: 'MediaFire'
	},
	insulted: {
		madeBy: '010nexus',
		releasedOn: { day: 23, month: 7, year: 2021 },
		lastUpdate: { day: 24, month: 12, year: 2025 },
		version: '1.00',
		status: 'Complete',
		downloadPage: 'https://010nexus.itch.io/insulted'
	},
	mizu: {
		madeBy: '010nexus',
		releasedOn: { day: 17, month: 2, year: 2014 },
		lastUpdate: { day: 4, month: 6, year: 2026 },
		version: 'WHOLE',
		status: 'In development',
		downloadPage: 'https://010nexus.itch.io/mizu'
	},
	journalnikki: {
		madeBy: '010nexus',
		releasedOn: { day: 25, month: 8, year: 2017 },
		lastUpdate: { day: 27, month: 8, year: 2020 },
		version: '1.06',
		status: 'In development',
		downloadPage: 'https://010nexus.itch.io/journal-nikki'
	},
	lapizlazuli: {
		madeBy: 'Jellyfish Legerdemain',
		releasedOn: { day: 16, month: 6, year: 2024 },
		lastUpdate: { day: 9, month: 1, year: 2026 },
		version: '0.2+',
		status: 'Complete',
		downloadPage: 'https://jellyfishlegerdemain.itch.io/lapis-lazuli'
	},
	yumearuki: {
		madeBy: 'UWONOZOKI',
		releasedOn: { day: 15, month: 11, year: 2013 },
		lastUpdate: { day: 16, month: 4, year: 2020 },
		version: '0.01b',
		status: 'In development',
		downloadPage: 'https://ux.getuploader.com/yume_aruki/download/7',
		downloadLabel: 'GetUploader'
	},
	mirchway: {
		madeBy: 'Vangare',
		releasedOn: { day: 24, month: 3, year: 2025 },
		lastUpdate: { day: 28, month: 7, year: 2026 },
		version: 'Alpha 0.1',
		status: 'In development',
		downloadPage: 'https://vangare.itch.io/mirchway'
	},
	unevendream: {
		madeBy: 'Team Uneven',
		releasedOn: { day: 27, month: 7, year: 2015 },
		lastUpdate: { day: 21, month: 5, year: 2026 },
		version: '0.09',
		status: 'In development',
		downloadPage: 'https://unevendream.itch.io/uneven-dream'
	},
	witoru: {
		madeBy: 'Atteiu',
		releasedOn: { day: 13, month: 6, year: 2010 },
		lastUpdate: { day: 4, month: 11, year: 2020 },
		version: 'β ++',
		status: 'In development',
		downloadPage: 'https://mega.nz/file/9q0E2TiJ#Y-61GRXSEzQMIYnuJdsNELO09GekVJao_XMbbaYiTBo',
		downloadLabel: 'Mega'
	},
	kagesouzouin: {
		madeBy: 'Atteiu',
		releasedOn: { day: 30, month: 1, year: 2011 },
		version: '0.08',
		status: 'Complete',
		downloadPage: 'https://www1.axfc.net/uploader/so/1729512',
		downloadLabel: 'axfc'
	},
	someday: {
		madeBy: 'Jojogape',
		releasedOn: { day: 21, month: 7, year: 2012 },
		lastUpdate: { day: 25, month: 1, year: 2024 },
		version: '0.11',
		status: 'In development',
		downloadPage: 'https://mega.nz/file/Bt9QWACC#aBmtLrmdwkwsbZm8b9JWcpUKBQ4Ib00ryqK7hOitLGA',
		downloadLabel: 'Mega'
	},
	unconscious: {
		madeBy: 'CoUn Dev Team',
		releasedOn: { day: 8, month: 6, year: 2024  },
		lastUpdate: { day: 15, month: 3, year: 2026 },
		version: '0.4.11',
		status: 'In development',
		downloadPage: 'https://collectiveunconscious.neocities.org/download',
		downloadLabel: 'neocities'
	},
    citrus: {
		madeBy: 'berond + Citrus Dev Team',
		releasedOn: { day: 31, month: 10, year: 2026  },
		lastUpdate: { day: 12, month: 11, year: 2026 },
		version: '0.4.11',
		status: 'In development, Collaborative',
		downloadPage: 'https://taranza15.itch.io/citrus',
	}
};

const slideExtensions: Record<string, string> = {
	deepdreams: 'png'
};

export const gameSlides: Record<string, GameSlide[]> = Object.fromEntries(
	Object.keys(gameDetails).map((slug) => [
		slug,
		[{ src: `/img/gamepopup/${slug}slide0.${slideExtensions[slug] ?? 'webp'}` }]
	])
);
