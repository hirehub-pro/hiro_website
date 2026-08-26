import { PROFESSION_CATALOG } from './profession-catalog';

// Kept async for backwards compatibility with existing callers. Profession
// metadata is intentionally local so category pages never wait for Firestore.
export async function getProfessions() {
  return PROFESSION_CATALOG;
}
