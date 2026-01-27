import { createClient, type Client } from '@libsql/client';

let dbInstance: Client | null = null;

export const getDb = () => {
    if (dbInstance) return dbInstance;

    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be defined');
    }

    dbInstance = createClient({
        url,
        authToken,
    });

    return dbInstance;
};
