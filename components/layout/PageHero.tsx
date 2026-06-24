"use client";

import { motion } from "framer-motion";

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

export function PageHero({
  kicker = "Live station intelligence",
  title,
  subtitle,
}: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-cyan-50/80 p-6 shadow-card md:p-8"
      aria-label="Page banner"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-56 rounded-full bg-cyan-200/25 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary-dark">
          {kicker}
        </p>
        <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-ink md:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
    </motion.section>
  );
}
