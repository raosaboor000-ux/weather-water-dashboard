import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-card transition-shadow duration-300 hover:shadow-card-hover ${className}`}
    >
      {children}
    </div>
  );
}
