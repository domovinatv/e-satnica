import type { APIRoute } from 'astro';
import { opcijePrijave } from '../../../lib/passkey';

export const prerender = false;

export const POST: APIRoute = async ({ url }) => Response.json(await opcijePrijave(url));
