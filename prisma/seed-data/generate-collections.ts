import { COLLECTION_DEFS } from "./constants";

export interface GeneratedCollection {
  id: string;
  title: string;
  handle: string;
  description: string;
  isSmart: boolean;
}

export function generateCollections(): GeneratedCollection[] {
  return COLLECTION_DEFS.map((def) => ({
    id: crypto.randomUUID(),
    title: def.title,
    handle: def.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    description: `${def.title} — curated picks from the Mango demo store.`,
    isSmart: def.isSmart,
  }));
}
