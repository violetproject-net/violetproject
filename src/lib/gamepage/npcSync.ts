
type Filter = 'allow' | 'block';
type Items = (number | string)[];
type IdRange = [number, number];
type Rule = { filter: Filter; items: Items; ranges?: IdRange[] };
// name rules are different to allow for more flexibility
type NameRule = { exact?: Rule; prefixes?: Rule };
type RuleEntry = { ids?: Rule; names?: NameRule };
export type NpcSyncRuleset = Record<string, RuleEntry>;

async function fetchRules(url: string): Promise<NpcSyncRuleset | null> {
	try {
		const r = await fetch(url, { cache: 'no-store' });
		if (!r.ok) return null;
		const j = await r.json().catch(() => null);
		return j && typeof j === 'object' && !Array.isArray(j) ? (j as NpcSyncRuleset) : null;
	} catch {
		return null;
	}
}

export class NpcSync {
	private rules: NpcSyncRuleset | undefined;

	async ensure(game: string) {
		const g = (game || '').toLowerCase();
		if (!g) return;
		console.log(`[violetproject] Fetching npc sync rules for game ${g}`);
		const maybe = await fetchRules(`/syncrules/${g}/npc.json`);
		if (!maybe) {
			console.log('no npc rules defined');
			return;
		}
		this.rules = maybe;
	}

	canSync(room: number, eventId: number, eventName: string): boolean {
		console.log(`canNpcSync: eventId: ${eventId}, eventName: ${eventName}`);
		if (!this.rules) {
			// no ruleset fetched from site, don't sync anything
			console.log('[violetproject] No npc sync rules for this game');
			return false;
		}

		const rules = this.rules[room];
		if (!rules) {
			console.log(`[violetproject] No npc sync rules for map ID ${room}`);
			return false;
		}

		if (rules.ids) {
			let result = rules.ids.items.includes(eventId);
			if (rules.ids.filter === 'block') {
				// invert condition
				result = !result;
			}
			if (result) {
				return true;
			}
			if (rules.ids.ranges) {
				for (const range of rules.ids.ranges) {
					const begin = range[0];
					const end = range[1];

					if (eventId >= begin && eventId <= end) {
						result = true;
						break;
					}
				}

				if (rules.ids.filter === 'block') {
					// invert condition
					result = !result;
				}
				if (result) {
					return true;
				}
			}
		}

		if (rules.names) {
			let result = rules.names.exact?.items?.includes(eventName) || false;
			if (rules.names.exact?.filter === 'block') {
				result = !result;
			}
			if (result) {
				return true;
			}

			result = rules.names.prefixes?.items?.some((prefix) => eventName.startsWith(prefix as string)) || false;
			if (rules.names.prefixes?.filter === 'block') {
				result = !result;
			}
			if (result) {
				return true;
			}
		}

		return false;
	}
}
