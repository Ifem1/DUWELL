"use client";
import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";
type CommonProps = { children: ReactNode; variant?: Variant; icon?: ReactNode; className?: string };

const cls = (v: Variant) =>
  v === "secondary" ? "brass-outline" : v === "danger" ? "clay-outline" : "brass-plate";

export function BrassPlateButton({
  children, variant = "primary", icon, className = "", ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`${cls(variant)} px-5 py-3 text-xs inline-flex items-center gap-2 ${className}`}
    >
      {icon && <span className="text-[14px] leading-none">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export function BrassPlateLink({
  children, variant = "primary", icon, className = "", href,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`${cls(variant)} px-5 py-3 text-xs inline-flex items-center gap-2 ${className}`}
    >
      {icon && <span className="text-[14px] leading-none">{icon}</span>}
      <span>{children}</span>
    </Link>
  );
}
