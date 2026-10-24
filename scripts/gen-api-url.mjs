import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '..');
const apiUrl = process.env.NG_APP_API_URL || 'http://localhost:3000/api';

const content = `export const API = '${apiUrl}';\n`;

writeFileSync(resolve(root, 'src', 'app', 'shared', 'constants', 'api.constant.ts'), content, 'utf-8');
console.log(`✅ API URL generado: ${apiUrl}`);
