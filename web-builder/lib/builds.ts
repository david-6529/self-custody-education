import {
  Sparkles,
  Frame,
  Trophy,
  Swords,
  Palette,
  Disc3,
  Puzzle,
  Gamepad2,
  Bot,
  Wand2,
  Globe2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BuildStatus = "live" | "soon";
export type BuildType = "tool" | "game" | "ai-agent" | "world-lore" | "ecosystem" | "showcase";
export type BuildOrigin = "official" | "vibeathon";

export interface BuildCreator {
  name: string;
  handle?: string;
}

export interface Build {
  id: string;
  name: string;
  tabName?: string;
  status: BuildStatus;
  type: BuildType;
  origin: BuildOrigin;
  url?: string;
  icon: LucideIcon;
  description: string;
  creator?: BuildCreator;
  isNew?: boolean;
  featured?: boolean;
}

const handleUrl = (h: string) => `https://x.com/${h.replace(/^@/, "")}`;

export const BUILDS: Build[] = [
  // ── GVC official ────────────────────────────────────────────
  {
    id: "prompt-machine",
    name: "The Prompt Machine",
    tabName: "Prompt Machine",
    status: "live",
    type: "tool",
    origin: "official",
    url: "/prompt-machine",
    icon: Sparkles,
    description:
      "Want to bring your GVC characters to life? Use our curated prompts to generate custom images, avatars, and scenes (or submit your own for the community!)",
    featured: true,
  },
  {
    id: "framery",
    name: "The Framery",
    tabName: "The Framery",
    status: "live",
    type: "tool",
    origin: "official",
    url: "/framery",
    icon: Frame,
    description:
      "Turn ordinary images into beautiful sharable moments. Drop in any image (or up to five) and customize it to fit your vibe. Share a screen that stops the scroll.",
    isNew: true,
    featured: true,
  },
  {
    id: "rewards-pool",
    name: "The Rewards Pool",
    tabName: "Rewards Pool",
    status: "live",
    type: "ecosystem",
    origin: "official",
    url: "https://vibepool.io/",
    icon: Trophy,
    description:
      "Collect Badges. Participate in the Eco. Access Rewards. VibePool is a dashboard that tracks the Rewards Pool and ongoing Vibe Strategy protocol activity.",
    featured: true,
  },
  {
    id: "vibe-off",
    name: "Vibe Off!",
    tabName: "Vibe Off!",
    status: "live",
    type: "game",
    origin: "official",
    url: "https://vibeoff.xyz/",
    icon: Swords,
    description:
      "A matchup game that pits randomized GVCs against each other head-to-head, in the ultimate battle for aesthetic supremacy. Play the 1v1 mode or submit a pairing into DUOS.",
    featured: true,
  },
  {
    id: "gallery",
    name: "The Gallery",
    tabName: "The Gallery",
    status: "live",
    type: "showcase",
    origin: "official",
    url: "https://gvcgallery.xyz/",
    icon: Palette,
    description:
      "From blank canvas to masterpiece! A space where artists, friends, and GVC community members can submit their handmade creations. Choose a blank and make something awesome.",
    featured: true,
  },
  {
    id: "wheel-of-vibes",
    name: "Wheel Of Vibes",
    tabName: "Wheel of Vibes",
    status: "live",
    type: "tool",
    origin: "official",
    url: "https://wheelofvibes.com/",
    icon: Disc3,
    description:
      "An interactive name-randomizer. Drop in a list of names or ETH wallet addresses, hit spin, and the wheel lands on a random winner with a celebration overlay. It's wired into the GVC ecosystem so entries can be filtered or weighted by the badges a holder has unlocked through their NFTs.",
    featured: true,
  },
  {
    id: "pin-drop",
    name: "Pin Drop",
    status: "soon",
    type: "game",
    origin: "official",
    url: "https://pindropgame.com",
    icon: Puzzle,
    description:
      "A new puzzle game from Good Vibes Club. Players can match pins, score big, and win prizes. Climb to the top of the leaderboard and collect all 101 pins!",
    featured: true,
  },

  // ── Vibeathon community submissions ─────────────────────────
  {
    id: "vibeathon-pindrop",
    name: "Pindrop",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://pindropgame.com",
    icon: Puzzle,
    description: "A match-3 game for GVC.",
    creator: { name: "bry", handle: "brydisanto" },
  },
  {
    id: "vibeathon-gvc-world",
    name: "GVC World",
    status: "live",
    type: "world-lore",
    origin: "vibeathon",
    url: "https://goodvibesclub.world",
    icon: Globe2,
    description:
      "A structured, searchable, community-owned archive that gives every GVC character a real presence.",
    creator: { name: "dort", handle: "0xdort" },
  },
  {
    id: "vibeathon-vibetown-nights",
    name: "Vibetown Nights",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://beefs-vibathon-project.vercel.app/",
    icon: Gamepad2,
    description: "A GVC-native dungeon crawler where your Vibie's traits set your class and stats.",
    creator: { name: "Aloof Beef", handle: "Lurxie_eth" },
  },
  {
    id: "vibeathon-vibetown-games-hub",
    name: "VibeTown Games Hub",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://vibetowngameshub.fun/",
    icon: Gamepad2,
    description: "A family-friendly games hub, classics and modern favorites under one GVC roof.",
    creator: { name: "Gabo Anany", handle: "Gabo_Anany" },
  },
  {
    id: "vibeathon-quaigbot-brain-dojo",
    name: "Quaigbot Brain Dojo",
    status: "live",
    type: "ai-agent",
    origin: "vibeathon",
    url: "https://gvc.quaigbot.com",
    icon: Bot,
    description:
      "An on-chain lore brain dojo, improv games feeding a lore wheel, paired with an Obsidian lore web.",
    creator: { name: "Master Quigg", handle: "burrylurkin" },
  },
  {
    id: "vibeathon-chateau-de-throttle",
    name: "Chateau de Throttle",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://chateau-de-throttle.vercel.app/",
    icon: Gamepad2,
    description: "A gold-themed 2D moto arcade, 3 games with a leaderboard.",
    creator: { name: "Scott", handle: "Crawliescreepto" },
  },
  {
    id: "vibeathon-bergenfox",
    name: "Bergenfox Story Universe",
    status: "live",
    type: "tool",
    origin: "vibeathon",
    url: "https://bergenfox.vercel.app/",
    icon: Wand2,
    description:
      "A collaborative story universe that turns your GVC character into graphic-novel panels.",
    creator: { name: "Jeff Lynch", handle: "bergenfox" },
  },
  {
    id: "vibeathon-chateau-defense",
    name: "Chateau Defense",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://www.chateaudefense.com",
    icon: Gamepad2,
    description: "A Chateau tower defense game.",
    creator: { name: "Keith McNamee", handle: "stuffkeithbuys" },
  },
  {
    id: "vibeathon-vibe-night",
    name: "Vibe Night",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://www.vibenight.app/",
    icon: Gamepad2,
    description: "A connected web arcade, six games, shared progression, achievements & leaderboards.",
    creator: { name: "GwillyMane", handle: "GwillyMane" },
  },
  {
    id: "vibeathon-vibe-o-matic",
    name: "vibe-o-matic",
    status: "live",
    type: "tool",
    origin: "vibeathon",
    url: "https://vibe-o-matic.vercel.app/",
    icon: Wand2,
    description:
      "Render-on-demand Vibetown art, drop in a photo or token ID, get a tiny cinematic scene.",
    creator: { name: "economist", handle: "economist" },
  },
  {
    id: "vibeathon-vibe-clash",
    name: "Vibe Clash",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://vibe-clash-beryl.vercel.app/",
    icon: Gamepad2,
    description:
      "A turn-based combat game where every GVC Citizen becomes a fighter, stats from on-chain rarity.",
    creator: { name: "Naoui Adam", handle: "another_padidie" },
  },
  {
    id: "vibeathon-content-studio",
    name: "GVC Content Studio",
    status: "live",
    type: "tool",
    origin: "vibeathon",
    url: "https://github.com/CharisTheAI/local-ai-brand-studio",
    icon: Wand2,
    description:
      "A local-first AI studio for character-consistent GVC content, runs on your own machine.",
    creator: { name: "CharisAI", handle: "charis_ai" },
  },
  {
    id: "vibeathon-vibetown-runner",
    name: "Vibetown Runner",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://vibetownrunner.com/",
    icon: Gamepad2,
    description: "A nostalgic pixel runner game.",
    creator: { name: "Maison", handle: "tmais0n" },
  },
  {
    id: "vibeathon-space-vibes",
    name: "Space Vibes",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://spacevibes.vercel.app/",
    icon: Gamepad2,
    description: "An endless space runner, dodge asteroids and convert bad vibers with good energy.",
    creator: { name: "Daphne", handle: "flippingcucken" },
  },
  {
    id: "vibeathon-bonk-that-duck",
    name: "Bonk That Duck",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://bonk-that-duck.vercel.app",
    icon: Gamepad2,
    description:
      "A Vampire-Survivors-like, fight waves of ducks, build badge upgrades, unlock GVC 1/1s.",
    creator: { name: "Bonk", handle: "bonk_that" },
  },
  {
    id: "vibeathon-vibetown-pov",
    name: "Vibetown POV",
    status: "live",
    type: "world-lore",
    origin: "vibeathon",
    url: "https://vibetown-pov.vercel.app/",
    icon: Globe2,
    description:
      "Every legendary post and vibe-filled moment, across socials + IRL, preserved for all.",
    creator: { name: "Jason", handle: "Booching12" },
  },
  {
    id: "vibeathon-vibe-battle",
    name: "Vibe Battle",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://aesr-gvc.vercel.app/",
    icon: Gamepad2,
    description: "Your GVC. Your stats. Your glory.",
    creator: { name: "Owen McDermott / AESR", handle: "imaesr" },
  },
  {
    id: "vibeathon-vibejamin",
    name: "Vibejamin",
    status: "live",
    type: "ai-agent",
    origin: "vibeathon",
    url: "https://x.com/Vibejamin_agent",
    icon: Bot,
    description: "The first ever GVC agent.",
    creator: { name: "Ty Guyot", handle: "tyguyot" },
  },
  {
    id: "vibeathon-vibe-boxes",
    name: "Vibe Boxes",
    status: "live",
    type: "game",
    origin: "vibeathon",
    url: "https://www.vibeboxes.xyz/",
    icon: Gamepad2,
    description: "A box-opening game chasing the best pulls, with a poker twist (Texas Vibe'em).",
    creator: { name: "Diego Ciborro", handle: "Diego_ciborro" },
  },
];

export const FEATURED_BUILDS = BUILDS.filter((b) => b.featured);

export const TYPE_LABELS: Record<BuildType, string> = {
  tool: "Tools",
  game: "Games",
  "ai-agent": "AI Agents",
  "world-lore": "World & Lore",
  ecosystem: "Ecosystem",
  showcase: "Showcases",
};

export const ORIGIN_LABELS: Record<BuildOrigin, string> = {
  official: "Official",
  vibeathon: "Vibeathon",
};

export { handleUrl };
