import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

const envExists = fs.existsSync(envPath);
const result = dotenv.config({ path: envPath });

console.log('[env] .env path:', envPath);
console.log('[env] .env exists:', envExists, '| parsed error:', result.error?.message ?? 'none');
console.log('[env] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
