// Callback testnog resursa #3988 (Registar ne dopušta isti redirect URI na dva resursa).
// prerender mora biti doslovno ovdje: Astro ga čita statički, re-export ne prepozna.
export const prerender = false;
export { GET } from '../callback';
