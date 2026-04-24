"use client";

import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  displayText: string;
  href: string;
  icon: ReactNode;
  title?: string;
  external?: boolean;
  copyText?: string;
  copiedMessage?: string;
  copyLabel?: string;
  className?: string;
};

/**
 * Единый контактный chip: ссылка на канал связи + опциональная кнопка копирования.
 */
export function PublicProfileContactPhone({
  displayText,
  href,
  icon,
  title,
  external = false,
  copyText,
  copiedMessage = "Скопировано",
  copyLabel = "Скопировать",
  className
}: Props) {
  async function handleCopy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success(copiedMessage);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div
      className={cn(
        "inline-flex max-w-full min-w-0 items-stretch overflow-hidden rounded-full border border-border/70 bg-background text-sm shadow-sm transition-colors hover:border-primary/40",
        className
      )}
    >
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        title={title ?? displayText}
        className="inline-flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-foreground transition-colors hover:bg-muted/80"
      >
        {icon}
        <span className="min-w-0 break-words text-left">{displayText}</span>
      </a>
      {copyText && (
        <>
          <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-auto w-9 shrink-0 rounded-none text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            onClick={handleCopy}
            aria-label={copyLabel}
            title={copyLabel}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </>
      )}
    </div>
  );
}
