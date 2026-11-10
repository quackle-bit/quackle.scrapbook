import type { InspirationCard } from "@/lib/inspiration";
import { toCollected } from "@/lib/inspiration";
import { scrapbookStore } from "@/lib/scrapbook/store";
import type { CardType, CollectedCard, Concept, Scrapbook } from "@/lib/scrapbook/types";

/**
 * Keep / favorite / custom for cards, against a concept. "Keep" collects the card into the
 * scrapbook (so other concepts can reuse it) and uses it in this concept; un-keeping only stops
 * using it here, the card stays in the collection.
 */

export const LIST_KEY = {
  mechanic: "mechanics",
  twist: "hookTwists",
  mood: "mood",
  setting: "setting",
  visual: "visualDirection",
  audio: "audioDirection",
} as const;
export type ListType = keyof typeof LIST_KEY;

function latest(bookId: string, conceptId: string) {
  const s = scrapbookStore.get();
  const book = s.scrapbooks.find((b) => b.id === bookId);
  const concept = s.concepts.find((c) => c.id === conceptId);
  return { book, concept };
}

export const findCollected = (book: Scrapbook, type: CardType, contentId: string) =>
  book.collected.find((c) => c.type === type && c.contentId === contentId);

export const cardsOf = (book: Scrapbook, ids: string[]): CollectedCard[] =>
  ids.map((id) => book.collected.find((c) => c.id === id)).filter((c): c is CollectedCard => !!c);

export function isKept(book: Scrapbook, concept: Concept, type: ListType, card: InspirationCard) {
  const c = findCollected(book, type, card.id);
  return !!c && concept[LIST_KEY[type]].includes(c.id);
}

export const isFav = (book: Scrapbook, type: CardType, card: InspirationCard) =>
  !!findCollected(book, type, card.id)?.isFavorite;

export function keep(bookId: string, conceptId: string, type: ListType, card: InspirationCard) {
  const id = scrapbookStore.collect(bookId, toCollected(card, type));
  addToConcept(bookId, conceptId, type, id);
}

export function addToConcept(bookId: string, conceptId: string, type: ListType, cardId: string) {
  const { concept } = latest(bookId, conceptId);
  if (!concept) return;
  const key = LIST_KEY[type];
  if (!concept[key].includes(cardId))
    scrapbookStore.updateConcept(conceptId, { [key]: [...concept[key], cardId] });
}

export function removeFromConcept(
  bookId: string,
  conceptId: string,
  type: ListType,
  cardId: string,
) {
  const { concept } = latest(bookId, conceptId);
  if (!concept) return;
  const key = LIST_KEY[type];
  const patch: Partial<Concept> = { [key]: concept[key].filter((x) => x !== cardId) };
  const prim = { ...concept.primary };
  (["mood", "setting", "visual", "audio"] as const).forEach((k) => {
    if (prim[k] === cardId) delete prim[k];
  });
  scrapbookStore.updateConcept(conceptId, { ...patch, primary: prim });
}

export function toggleKeep(
  bookId: string,
  conceptId: string,
  type: ListType,
  card: InspirationCard,
) {
  const { book, concept } = latest(bookId, conceptId);
  if (!book || !concept) return;
  const c = findCollected(book, type, card.id);
  if (c && concept[LIST_KEY[type]].includes(c.id)) removeFromConcept(bookId, conceptId, type, c.id);
  else keep(bookId, conceptId, type, card);
}

export function toggleFavorite(bookId: string, type: CardType, card: InspirationCard) {
  const { book } = latest(bookId, "");
  const have = book && findCollected(book, type, card.id);
  if (have) scrapbookStore.updateCard(bookId, have.id, { isFavorite: !have.isFavorite });
  else {
    // Favoriting a card you haven't kept collects it (but doesn't use it in the concept).
    scrapbookStore.collect(bookId, { ...toCollected(card, type), isFavorite: true });
  }
}

export function addCustom(
  bookId: string,
  conceptId: string,
  type: ListType,
  c: { title: string; description: string },
) {
  const id = scrapbookStore.collect(bookId, {
    type,
    title: c.title,
    description: c.description,
    source: "custom",
  });
  addToConcept(bookId, conceptId, type, id);
}

export function toggleFavoriteById(bookId: string, cardId: string) {
  const { book } = latest(bookId, "");
  const c = book?.collected.find((x) => x.id === cardId);
  if (c) scrapbookStore.updateCard(bookId, cardId, { isFavorite: !c.isFavorite });
}
