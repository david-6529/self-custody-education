"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// Matches the `Version:` header in /LICENSE and /TERMS.md. Bumping this forces
// every visitor to re-accept the next time they try to scaffold a project.
export const WEB_TERMS_VERSION = "1.1.0";
const STORAGE_KEY = "gvc-terms-accepted";
const TERMS_URL = "https://github.com/brydisanto/gvc-builder-kit/blob/main/TERMS.md";
const LICENSE_SUMMARY_URL = "https://github.com/brydisanto/gvc-builder-kit/blob/main/LICENSE-SUMMARY.md";

interface StoredAcceptance {
  termsVersion: string;
  acceptedAt: string;
}

export function hasAcceptedTerms(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredAcceptance;
    return parsed.termsVersion === WEB_TERMS_VERSION;
  } catch {
    return false;
  }
}

function recordAcceptance() {
  if (typeof window === "undefined") return;
  const payload: StoredAcceptance = {
    termsVersion: WEB_TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

interface TermsGateProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export default function TermsGate({ open, onAccept, onCancel }: TermsGateProps) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!open) setChecked(false);
  }, [open]);

  function handleAccept() {
    if (!checked) return;
    recordAcceptance();
    onAccept();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-gvc-dark border border-gvc-gold/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(255,224,72,0.1)]"
          >
            <p className="text-gvc-gold/60 font-display font-bold text-xs uppercase tracking-[0.12em] mb-2">
              Before you start
            </p>
            <h2 className="font-display font-black text-white text-2xl sm:text-3xl mb-4 leading-tight">
              Terms of Use
            </h2>

            <div className="text-white/60 font-body text-sm leading-relaxed space-y-3 mb-5">
              <p>
                By using the GVC Builder Kit you agree to the GVC Builder Kit Community License:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-white/50">
                <li>Non-commercial community use is free</li>
                <li>Commercial use requires a separate license from Toast Studio</li>
                <li>You must follow GVC brand rules</li>
                <li>You may not register domains, handles, or token tickers using the GVC brand</li>
              </ul>
              <p className="text-white/40 text-xs pt-1">
                <a
                  href={LICENSE_SUMMARY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gvc-gold/70 hover:text-gvc-gold underline underline-offset-2 transition-colors"
                >
                  Read the Terms summary
                </a>
                {" · "}
                <a
                  href={TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gvc-gold/70 hover:text-gvc-gold underline underline-offset-2 transition-colors"
                >
                  Full Terms
                </a>
              </p>
            </div>

            <label
              className="flex items-start gap-3 rounded-xl bg-black/30 border border-white/[0.08] p-3 mb-5 cursor-pointer hover:border-gvc-gold/25 transition-colors"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 accent-gvc-gold"
              />
              <span className="text-white/70 font-body text-sm leading-relaxed">
                I&apos;ve read and accept the Terms of Use (v{WEB_TERMS_VERSION}).
              </span>
            </label>

            <div className="flex flex-col sm:flex-row-reverse gap-3">
              <button
                onClick={handleAccept}
                disabled={!checked}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gvc-gold text-gvc-black font-display font-bold text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(255,224,72,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                Accept and continue
              </button>
              <button
                onClick={onCancel}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-white/50 font-display font-bold text-sm uppercase tracking-wider hover:text-white/80 hover:bg-white/[0.04] transition-colors"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
