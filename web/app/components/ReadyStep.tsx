"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Download,
  FolderOpen,
  ClipboardPaste,
} from "lucide-react";
import Image from "next/image";

// Template label map
const TEMPLATE_LABELS: Record<string, string> = {
  "project-site": "Website / Landing Page",
  tracker: "Tracker / Dashboard",
  dashboard: "Dashboard / Tracker",
  "mini-game": "Game",
  gallery: "Gallery",
  "vote-and-rank": "Vote & Rank",
  "badge-wallet-tool": "Badge / Wallet Lookup",
  "rarity-checker": "Rarity / Price Checker",
  leaderboard: "Community Leaderboard",
  "sweep-tracker": "Sweep / Floor Tracker",
  "lookup-tool": "Lookup Tool",
  "card-maker": "Card / Image Maker",
  "profile-page": "Profile Page",
  "blank-canvas": "Blank Canvas",
};

// Addon label map
const ADDON_LABELS: Record<string, string> = {
  "collection-data": "GVC Collection info",
  "token-prices": "Live token prices",
  "web3-wallet": "Wallet connection",
  "stats-panel": "Stats and charts",
  leaderboard: "Leaderboard",
  auth: "User accounts",
  "game-engine": "Game starter kit",
  "audio-mixer": "Sound and music",
  toasts: "Pop-up notifications",
  "ipfs-images": "NFT image loading",
  "on-chain-reads": "Blockchain lookups",
  "badge-collection": "Badge collection",
  "vercel-kv": "Save and store data",
};

interface ReadyStepProps {
  projectName: string;
  template: string;
  description: string;
  addons: string[];
  onBack: () => void;
}

export default function ReadyStep({
  projectName,
  template,
  description,
  addons,
  onBack,
}: ReadyStepProps) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [activeMethod, setActiveMethod] = useState<"claude" | "terminal">("claude");
  const [activeStep, setActiveStep] = useState(0); // 0 = not started

  // Build the CLI command
  const buildCommand = useCallback(() => {
    let cmd = `npx create-gvc-app --name ${projectName} --template ${template}`;
    cmd += ` --description "${description.replace(/"/g, '\\"')}"`;
    if (addons.length > 0) {
      cmd += ` --addons ${addons.join(",")}`;
    }
    return cmd;
  }, [projectName, template, description, addons]);

  const command = buildCommand();

  // Build the Claude Code prompt
  const addonLabels = addons.map((a) => ADDON_LABELS[a] || a).join(", ");
  const claudePrompt = `Run this command to scaffold my project:

${command}

After running the command, cd into the ${projectName} directory and read CLAUDE.md for the full brand system, APIs, and code patterns.

Then build me a working prototype in app/page.tsx based on this idea:

Project: ${projectName}
Template: ${TEMPLATE_LABELS[template] || template}
Idea: ${description}${addons.length > 0 ? `\nExtras: ${addonLabels}` : ""}

Use the GVC brand system (dark theme, gold accents, Brice + Mundial fonts, shimmer effects) and real data from the GVC APIs. Make it look polished and production-ready.

After building, run "npm run dev" to start the project. Then give me a short, simple summary that a non-technical person can understand. Use this exact format:

"Your project is ready! Here is what I built:
- [2-3 bullet points describing what the app does, in plain English]

To see it, open this link in your browser: http://localhost:3000

If you want to change anything, just tell me in plain English."

Do NOT include technical jargon, implementation details, file names, library names, terminal commands, or code references in your summary. Write it like you are talking to someone who has never coded before.`;

  async function copyToClipboard(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setter(true);
    setTimeout(() => setter(false), 3000);
  }

  function handleStep1() {
    copyToClipboard(claudePrompt, setCopiedPrompt);
    setActiveStep(1);
    // Try to open the desktop app via URL scheme, fall back to download page
    setTimeout(() => {
      window.location.href = "claude://";
      setTimeout(() => {
        window.open("https://claude.ai/download", "_blank");
      }, 1500);
    }, 300);
  }

  const claudeSteps = [
    {
      icon: Download,
      title: "Open Claude Code",
      description: "We will copy your project setup to your clipboard and open the Claude Code desktop app.",
      action: "Open Claude Code",
      actionDone: "Copied! Opening...",
      detail: null,
    },
    {
      icon: FolderOpen,
      title: "Choose a folder",
      description: "Claude Code will ask you to select a folder. Choose where you want your project to live.",
      action: null,
      actionDone: null,
      detail: "Pick any folder like Desktop, Documents, or a Projects folder. Claude will create a new folder inside it.",
    },
    {
      icon: ClipboardPaste,
      title: "Paste and hit Enter",
      description: "Your project setup is already on your clipboard. Just paste it into Claude Code and press Enter.",
      action: null,
      actionDone: null,
      detail: "Claude will install everything, set up the GVC brand system, and start building your project automatically.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center px-4 max-w-2xl mx-auto w-full"
    >
      {/* Shaka icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
        className="flex items-center gap-4 mb-4"
      >
        <Image
          src="/shaka.png"
          alt="GVC Shaka"
          width={56}
          height={56}
          className="drop-shadow-[0_0_20px_rgba(255,224,72,0.3)]"
        />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-3xl sm:text-4xl font-display font-black text-shimmer mb-3 text-center"
      >
        YOUR PROJECT IS READY
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-white/50 font-body mb-8 text-center text-lg"
      >
        Here is what you picked. Now choose how you want to get started.
      </motion.p>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="w-full glass-card snake-border p-6 mb-8"
      >
        <div className="space-y-4 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/40 text-xs font-body uppercase tracking-wider mb-1">
                Project
              </p>
              <p className="text-white font-display font-bold text-lg">
                {projectName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs font-body uppercase tracking-wider mb-1">
                Template
              </p>
              <p className="text-gvc-gold font-display font-bold">
                {TEMPLATE_LABELS[template] || template}
              </p>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <p className="text-white/40 text-xs font-body uppercase tracking-wider mb-1">
              Your idea
            </p>
            <p className="text-white/70 text-sm font-body leading-relaxed">
              {description}
            </p>
          </div>

          {addons.length > 0 && (
            <>
              <div className="h-px bg-white/[0.06]" />
              <div>
                <p className="text-white/40 text-xs font-body uppercase tracking-wider mb-2">
                  Extras ({addons.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {addons.map((addon) => (
                    <span
                      key={addon}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-gvc-gold/10 border border-gvc-gold/15 text-gvc-gold text-xs font-body"
                    >
                      {ADDON_LABELS[addon] || addon}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Method tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full mb-6"
      >
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setActiveMethod("claude"); setActiveStep(0); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display font-bold text-sm transition-all ${
              activeMethod === "claude"
                ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                : "border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            Open in Claude Code
          </button>
          <button
            onClick={() => setActiveMethod("terminal")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display font-bold text-sm transition-all ${
              activeMethod === "terminal"
                ? "bg-gvc-gold/15 text-gvc-gold border border-gvc-gold/30"
                : "border border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/15"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Use your terminal
          </button>
        </div>

        {/* Open in Claude Code flow */}
        {activeMethod === "claude" && (
          <div className="space-y-4">
            {claudeSteps.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = activeStep === 0 ? i === 0 : i <= activeStep;
              const isCurrent = activeStep === 0 ? i === 0 : i === activeStep;
              const isDone = activeStep > 0 && i < activeStep;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i, duration: 0.4 }}
                  className={`
                    relative rounded-2xl border p-6 transition-all duration-300
                    ${isCurrent
                      ? "bg-gvc-dark border-gvc-gold/30 shadow-[0_0_30px_rgba(255,224,72,0.05)]"
                      : isDone
                        ? "bg-gvc-dark/50 border-gvc-green/20"
                        : "bg-gvc-dark/30 border-white/[0.04] opacity-40"
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number */}
                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                      ${isDone
                        ? "bg-gvc-green/15 text-gvc-green"
                        : isCurrent
                          ? "bg-gvc-gold/15 text-gvc-gold"
                          : "bg-white/5 text-white/20"
                      }
                    `}>
                      {isDone ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-body uppercase tracking-wider ${
                          isDone ? "text-gvc-green/60" : isCurrent ? "text-gvc-gold/60" : "text-white/20"
                        }`}>
                          Step {i + 1}
                        </span>
                        {isDone && (
                          <span className="text-xs font-body text-gvc-green/60">Done</span>
                        )}
                      </div>
                      <h3 className={`font-display font-bold text-lg mb-1.5 ${
                        isDone ? "text-gvc-green" : isCurrent ? "text-white" : "text-white/40"
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`font-body text-sm leading-relaxed ${
                        isCurrent ? "text-white/50" : "text-white/25"
                      }`}>
                        {step.description}
                      </p>

                      {/* Detail note */}
                      {step.detail && isCurrent && (
                        <div className="mt-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <p className="text-white/35 font-body text-xs leading-relaxed">
                            {step.detail}
                          </p>
                        </div>
                      )}

                      {/* Action button for step 1 */}
                      {i === 0 && isCurrent && !isDone && (
                        <button
                          onClick={handleStep1}
                          className={`
                            mt-4 inline-flex items-center justify-center gap-2.5 px-7 py-3.5
                            font-display font-bold text-base rounded-xl
                            transition-all duration-300
                            ${copiedPrompt
                              ? "bg-gvc-green/20 text-gvc-green border border-gvc-green/30"
                              : "bg-gvc-gold text-gvc-black hover:shadow-[0_0_30px_rgba(255,224,72,0.3)]"
                            }
                          `}
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="w-5 h-5" />
                              {step.actionDone}
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-5 h-5" />
                              {step.action}
                            </>
                          )}
                        </button>
                      )}

                      {/* Keyboard shortcut hint for step 3 */}
                      {i === 2 && isCurrent && (
                        <div className="mt-3 flex items-center gap-2">
                          <kbd className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-mono border border-white/10">Cmd</kbd>
                          <span className="text-white/20 text-xs">+</span>
                          <kbd className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-mono border border-white/10">V</kbd>
                          <span className="text-white/30 text-xs font-body ml-1">to paste</span>
                          <span className="text-white/10 text-xs font-body mx-1">|</span>
                          <kbd className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-xs font-mono border border-white/10">Enter</kbd>
                          <span className="text-white/30 text-xs font-body ml-1">to go</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress connector */}
                  {i < claudeSteps.length - 1 && (
                    <div className={`absolute -bottom-4 left-9 w-0.5 h-4 transition-colors duration-300 ${
                      isDone ? "bg-gvc-green/20" : "bg-white/[0.04]"
                    }`} />
                  )}
                </motion.div>
              );
            })}

            {/* Step progression buttons */}
            {activeStep > 0 && activeStep < claudeSteps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-end"
              >
                <button
                  onClick={() => setActiveStep((s) => s + 1)}
                  className="px-5 py-2.5 rounded-xl bg-gvc-gold/15 border border-gvc-gold/30 text-gvc-gold font-display font-bold text-sm hover:bg-gvc-gold/25 transition-all flex items-center gap-2"
                >
                  I did this, next step
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
              </motion.div>
            )}

            {/* Download link */}
            <p className="text-white/20 text-xs font-body text-center pt-2">
              Don&apos;t have Claude Code?{" "}
              <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer" className="text-gvc-gold/40 hover:text-gvc-gold/70 underline underline-offset-2 transition-colors">
                Download it free here
              </a>
              {" "}(Mac, Windows, Linux)
            </p>
          </div>
        )}

        {/* Terminal flow */}
        {activeMethod === "terminal" && (
          <div className="glass-card snake-border p-6">
            <p className="text-white/40 font-body text-sm mb-5">
              Open your terminal and paste these commands one at a time. Your project page will guide you through the rest.
            </p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gvc-gold/15 text-gvc-gold text-sm font-bold flex items-center justify-center mt-0.5">
                  1
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-body font-semibold text-sm mb-2">
                    Create your project
                  </p>
                  <div className="bg-black/40 rounded-xl p-4 mb-1">
                    <code className="text-gvc-green/90 text-sm break-all whitespace-pre-wrap">
                      {command}
                    </code>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gvc-gold/15 text-gvc-gold text-sm font-bold flex items-center justify-center mt-0.5">
                  2
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-body font-semibold text-sm mb-2">
                    Start it up
                  </p>
                  <div className="bg-black/40 rounded-xl p-4 space-y-1">
                    <code className="text-gvc-green/90 text-sm block">cd {projectName}</code>
                    <code className="text-gvc-green/90 text-sm block">npm run dev</code>
                  </div>
                  <p className="text-white/30 text-xs font-body mt-1.5">
                    Then open{" "}
                    <span className="text-white/50 font-mono">localhost:3000</span>{" "}
                    in your browser.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gvc-gold/15 text-gvc-gold text-sm font-bold flex items-center justify-center mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-white font-body font-semibold text-sm">
                    Follow the page
                  </p>
                  <p className="text-white/40 text-sm font-body">
                    Your project page walks you through downloading Claude Code, opening your project, and building it. Just follow the steps on screen.
                  </p>
                </div>
              </div>
            </div>

            {/* Copy command button */}
            <button
              onClick={() => copyToClipboard(command, setCopiedCommand)}
              className={`
                mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-4
                font-display font-bold text-base rounded-xl
                transition-all duration-300
                ${
                  copiedCommand
                    ? "bg-gvc-green/20 text-gvc-green border border-gvc-green/30"
                    : "bg-gvc-gold text-gvc-black hover:shadow-[0_0_30px_rgba(255,224,72,0.3)]"
                }
              `}
            >
              {copiedCommand ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied to clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy setup command
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* What you need */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="w-full glass-card p-5 mb-8"
      >
        <p className="text-white/50 text-sm font-body mb-3">
          You will need:
        </p>
        <div className="space-y-2">
          <a
            href="https://nodejs.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gvc-gold/80 text-sm font-body hover:text-gvc-gold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Node.js (powers your project)
          </a>
          <a
            href="https://claude.ai/download"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gvc-gold/80 text-sm font-body hover:text-gvc-gold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Claude Code (builds your project for you)
          </a>
        </div>
      </motion.div>

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <button
          onClick={onBack}
          className="
            inline-flex items-center gap-2 px-5 py-3
            text-white/50 font-body text-sm
            rounded-xl border border-white/10
            hover:border-white/20 hover:text-white/70
            transition-all duration-200
          "
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </motion.div>
    </motion.div>
  );
}
