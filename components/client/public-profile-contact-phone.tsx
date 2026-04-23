"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { ContactBrandPhoneIcon } from "@/components/client/contact-channel-brand-icons";
import { Button } from "@/components/ui/button";
import { normalizePhoneForCopy } from "@/lib/public-contact-format";
import { cn } from "@/lib/utils";

type Props = {
  displayText: string;
  href: string;
  className?: string;
};

/**
 * Телефон: ссылка tel: и кнопка копирования в буфер.
 */
export function PublicProfileContactPhone({ displayText, href, className }: Props) {
  const toCopy = normalizePhoneForCopy(displayText);

  async function handleCopy() {
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      toast.success("Номер скопирован");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div
      className={cn(
        "inline-flex max-w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-background text-sm shadow-sm",
        className
      )}
    >
      <a
        href={href}
        title={displayText}
        className="inline-flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-foreground transition-colors hover:bg-muted/80"
      >
        <ContactBrandPhoneIcon className="shrink-0" />
        <span className="min-w-0 break-words text-left">{displayText}</span>
      </a>
      <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-auto w-9 shrink-0 rounded-none text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        onClick={handleCopy}
        aria-label="Скопировать номер"
        title="Скопировать номер"
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
