# Craig Keeps the Keys

Local comic package for a 6529 self-custody education story centered on Craig.

## Files

- `comic.html` - the comic master file. Open this in a browser to review the full book.
- `generated-art/page-01-title-art.png` through `generated-art/page-12-art.png` - generated page art without lettering.
- `pages/page-01.png` through `pages/page-12.png` - exported comic pages with lettering.
- `assets/` - copied local references and GVC assets used by the comic.
- `render-comic.mjs` - local renderer that exports the PNG pages with headless Chrome.

## Story coverage

The story follows Craig buying a 6529 meme card, making common wallet mistakes, learning from the mentor, and setting up TAP:

- private keys and seed phrase safety
- hardware wallets
- reading wallet signatures
- avoiding phishing, screen sharing, and malicious sites
- Three Address Protocol: A vault, B transaction, C minting
- Safe / Gnosis Safe as a multi-signature vault option
- delegation for the 6529 ecosystem
- freedom to transact as a basic peaceful freedom
- joining the 6529 network with a decentralized esports community idea

## Re-render

From this repo root:

```bash
node output/craig-self-custody-comic/render-comic.mjs
```

The renderer writes PNG pages into `output/craig-self-custody-comic/pages/`.
