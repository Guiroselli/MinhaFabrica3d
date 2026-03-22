import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'test' });
type Config = Parameters<typeof ai.models.generateImages>[0]['config'];
type Key = keyof Config;
// @ts-expect-error - forcing TS to show the keys in a crash or log
const keys: Record<Key, any> = {};
