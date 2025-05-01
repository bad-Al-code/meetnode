import dotenv from 'dotenv';
import path from 'node:path';

const envPath = path.resolve(__dirname, '../.env.test');
const loadResult = dotenv.config({ path: envPath });

jest.setTimeout(15000);

beforeAll(async () => {});
afterAll(async () => {});

export {};
