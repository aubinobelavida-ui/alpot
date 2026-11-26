import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.log('Aucune URL Turso détectée. Utilisation de SQLite local par défaut.');
}

export function getTursoClient() {
  if (!url) return null;
  return createClient({
    url,
    authToken,
  });
}
