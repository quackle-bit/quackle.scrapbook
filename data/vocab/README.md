# Vocabulary banks

One JSON file per bank. Types live in `src/lib/vocab.ts`; tags must come from its `TAGS` list.

```json
{
  "slot": "world",
  "part": "place",
  "target": 600,
  "entries": [
    {
      "word": "night market",
      "tags": ["social", "urban"],
      "rarity": "common",
      "flavor": "Lanterns until dawn."
    }
  ]
}
```

- `npm run vocab:lint` checks rarities, tags, duplicates and shows progress toward each `target`.
- `npm run vocab:sample [seed]` prints one card per slot; the same seed gives the same cards.

`world` cards combine one entry each from place · era · inhabitant; `look` cards combine dimension · treatment · camera.
This is a hand-written starter set (~200 entries). Grow it toward the targets in CLAUDE.md §7.
