import { Sparkles, Frame, Trophy, Swords, Palette, Disc3, Puzzle, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BuildStatus = "live" | "soon";
export type BuildType = "tool" | "game" | "ecosystem" | "showcase";

export interface Build {
  id: string;
  name: string;
  tabName?: string;
  status: BuildStatus;
  type: BuildType;
  url?: string;
  icon: LucideIcon;
  description: string;
  isNew?: boolean;
  featured?: boolean;
}

export const BUILDS: Build[] = [
  {
    id: "prompt-machine",
    name: "The Prompt Machine",
    tabName: "Prompt Machine",
    status: "live",
    type: "tool",
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
    url: "https://wheelofvibes.com/",
    icon: Disc3,
    description:
      "An interactive name-randomizer. Drop in a list of names or ETH wallet addresses, hit spin, and the wheel lands on a random winner with a celebration overlay. It's wired into the GVC ecosystem so entries can be filtered or weighted by the badges a holder has unlocked through their NFTs.",
    featured: true,
  },
  {
    id: "vibeathon-showcase",
    name: "Vibeathon Showcase",
    tabName: "Vibeathon",
    status: "live",
    type: "showcase",
    url: "https://gvc-vibeathon-showcase.vercel.app/",
    icon: Rocket,
    description:
      "Explore 19+ community-built games, agents, and tools shipped for the Vibeathon. From match-3 puzzles to dungeon crawlers, tower defense to story generators — discover what the GVC community made when handed the keys.",
    isNew: true,
  },
  {
    id: "pin-drop",
    name: "Pin Drop",
    status: "soon",
    type: "game",
    url: "https://pindropgame.com",
    icon: Puzzle,
    description:
      "A new puzzle game from Good Vibes Club. Players can match pins, score big, and win prizes. Climb to the top of the leaderboard and collect all 101 pins!",
    featured: true,
  },
];

export const FEATURED_BUILDS = BUILDS.filter((b) => b.featured);

export const TYPE_LABELS: Record<BuildType, string> = {
  tool: "Tools",
  game: "Games",
  ecosystem: "Ecosystem",
  showcase: "Showcases",
};
