# Craig Keeps the Keys: 6-Page Edition

Short version of the Craig self-custody comic.

## Files

- `comic.html` - the master HTML for the condensed 6-page comic.
- `pages/page-01.png` through `pages/page-06.png` - rendered PNG exports.
- `render-comic.mjs` - renderer for the local PNG pages.

This package reuses the accepted generated art and fonts from `output/craig-self-custody-comic/`, then crops the existing panels into a shorter story.

## Story Coverage

- Craig loses a company-controlled game world.
- Craig decides to build an open community-owned game.
- Craig creates a meme card to fund the community.
- Punk6529 teaches private keys, seed phrases, hardware wallets, TAP, and Safe.
- Craig joins the 6529 Network with a player-run esports community.

## Re-render

From the repo root:

```bash
node output/craig-self-custody-comic-6-page/render-comic.mjs
```
