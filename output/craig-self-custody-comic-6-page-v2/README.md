# Craig Keeps the Keys: 6-Page Edition V2

Color restyle of the condensed six-page self-custody comic.

## Files

- `comic.html` is the editable page-layout and copy source.
- `assets/page-01-freedom-to-transact.jpeg` is the supplied cover image.
- `generated-art/page-02-art.png` through `page-06-art.png` are the five AI-generated six-scene art sheets.
- `pages/page-01.png` through `page-06.png` are the final rendered comic pages.
- `render-comic.mjs` renders the local PNG pages.

Pages 2–6 preserve the scenes and text of the original six-page edition while restyling the art to match the supplied warm, colorful 3D character references. Page 1 uses the supplied Punk6529 classroom image with “Freedom to Transact” on the chalkboard.

## Re-render

From the repo root:

```bash
node output/craig-self-custody-comic-6-page-v2/render-comic.mjs
```
