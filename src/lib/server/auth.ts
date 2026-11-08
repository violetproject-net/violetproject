import 'dotenv/config'; // FIXME  what the actual fuck?
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { username } from "better-auth/plugins";
import { getRequestEvent } from "$app/server";
import { db } from "./db";
import * as schema from "./schema";
import { insertClosedSession } from "./session-log";

export function createAuth() {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
        throw new Error("BETTER_AUTH_SECRET not set");
    }

    return betterAuth({
        database: drizzleAdapter(db, { provider: "mysql", schema }),
        secret,
        baseURL: process.env.BETTER_AUTH_URL,
        trustedOrigins: [
            "https://violetproject.net",
            process.env.BETTER_AUTH_URL,
            "http://localhost:4000",
            "http://127.0.0.1:4000"
        ].filter((origin): origin is string => Boolean(origin)),
        emailAndPassword: {
            enabled: true
        },
        advanced: {
            ipAddress: {
                ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
            },
        },
        databaseHooks: {
            session: {
                delete: {
                    before: async (session) => {
                        try {
                            await insertClosedSession(
                                {
                                    id: String(session.id || ""),
                                    userId: session.userId ? String(session.userId) : null,
                                    ip: session.ipAddress ? String(session.ipAddress) : null,
                                    ua: session.userAgent ? String(session.userAgent) : null,
                                    createdAt: session.createdAt ?? null,
                                    updatedAt: session.updatedAt ?? null,
                                    expiresAt: session.expiresAt ?? null
                                },
                                "logout"
                            );
                        } catch {}
                    }
                }
            }
        },
        plugins: [
            username({
                minUsernameLength: 1,
                maxUsernameLength: 22
            }),
            sveltekitCookies(getRequestEvent)
        ]
    });
}
