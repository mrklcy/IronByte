import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "soft";
  size?: "sm" | "md" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "icon" && "h-10 w-10",
        variant === "primary" && "bg-primary text-primary-foreground shadow-lift hover:-translate-y-0.5 hover:bg-[#4338CA]",
        variant === "secondary" && "bg-accent text-accent-foreground hover:bg-[#0F9F92]",
        variant === "outline" && "border border-border bg-surface text-foreground hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "soft" && "bg-primary/10 text-primary hover:bg-primary/15",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-surface shadow-sm transition-all duration-200", className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "slate",
  children,
}: HTMLAttributes<HTMLSpanElement> & { tone?: "indigo" | "teal" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    indigo: "bg-primary/10 text-primary",
    teal: "bg-accent/12 text-teal-700 dark:text-teal-200",
    green: "bg-green-500/10 text-green-700 dark:text-green-300",
    amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    red: "bg-red-500/10 text-red-700 dark:text-red-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)} aria-hidden="true">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted-foreground",
        "transition-colors focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10",
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold tracking-normal text-foreground">{title}</h2>
      {action}
    </div>
  );
}
