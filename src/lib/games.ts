export type GameInfo = {
	slug: string;
	name: string;
	home: boolean;
};

// key and fallback refers to t(key, fallback)
// key: "sortBy.dateAdded", fallback: "Recently Added"
// is equivalent to doing
// t('sortBy.dateAdded', 'Recently Added')

// this might seem like fucking stupid but idk lol
// this is just to make it so theres auto complete in other areas
export type SortMethodType = 
	"dateAdded" | 
    "releaseDate" | 
    "lastUpdate" |
    "authors" |
    "name" |
    "playerCount";

export type SortMethod = {
	value: SortMethodType;
	key: string;
	fallback: string;
}

export const sortMethods: SortMethod[] = [
	{ value: "dateAdded", 		key: "sortBy.dateAdded", 	fallback: "Recently Added" },
	{ value: "releaseDate", 	key: "sortBy.releaseDate", 	fallback: "Release Date" },
	{ value: "lastUpdate", 		key: "sortBy.lastUpdate", 	fallback: "Last Update" },
	{ value: "authors", 		key: "sortBy.authors", 		fallback: "Authors" },
	{ value: "name", 			key: "sortBy.name", 		fallback: "Game Name" },
	{ value: "playerCount", 	key: "sortBy.playerCount", 	fallback: "Player Count" },
];

export const games: GameInfo[] = [
	{ slug: 'loveyou', name: 'Love You', home: true },
	{ slug: 'blackrain', name: 'Black Rain', home: true },
	{ slug: 'unaccomplished', name: 'Unaccomplished', home: true },
	{ slug: 'yugennoyume', name: 'Yugen no Yume', home: true },
	{ slug: 'lovedrains', name: 'Love Drains', home: true },
	{ slug: 'notedream', name: 'Note Dream', home: true },
	{ slug: 'deepdreams', name: 'Deep Dreams', home: true },
	{ slug: 'scarynikki', name: 'Scary Nikki', home: true },
	{ slug: 'dotflow', name: '.flow', home: true },
	{ slug: 'cold', name: '[COLD]', home: true },
	{ slug: 'represal', name: 'RepresaL', home: true },
	{ slug: 'yumetsushin', name: 'Yume Tsushin', home: true },
	{ slug: 'dreamgenie', name: 'Dream Genie', home: true },
	{ slug: 'amillusion', name: 'Amillusion', home: true },
	{ slug: 'me', name: 'Me', home: true },
	{ slug: 'doorofthoughts', name: 'The Door Of Thoughts', home: true },
	{ slug: 'remedy', name: 'Remedy', home: true },
	{ slug: 'somnium', name: 'Somnium', home: true },
	{ slug: 'insulted', name: 'Insulted', home: true },
	{ slug: 'journalnikki', name: 'Journal Nikki', home: true },
	{ slug: 'mizu', name: 'Mizu', home: true },
	{ slug: 'lapizlazuli', name: 'LAPIS lAZULi', home: true },
	{ slug: 'yumearuki', name: 'Yume Aruki', home: true },
	{ slug: 'mirchway', name: 'Rightmock Mirchway', home: true },
	{ slug: 'unevendream', name: 'Uneven Dream', home: true },
	{ slug: 'witoru', name: 'Witoru', home: true },
	{ slug: 'kagesouzouin', name: 'Kage, Souzou, In', home: true },
	{ slug: 'someday', name: 'Someday', home: true },
	{ slug: 'unconscious', name: 'Collective Unconscious', home: true },
	{ slug: 'scoobydoo', name: 'Scooby Doo', home: false }
];

export const homeGames = games.filter((g) => g.home);

export const gameBySlug = (slug: string | null | undefined) => games.find((g) => g.slug === slug);
