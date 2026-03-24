/**
 * На узких экранах (как в Tailwind `max-md`) после выбора дня в календаре
 * внутри `Popover` нужно закрывать popover — иначе на тач-устройствах
 * поверх остаётся слой календаря.
 */
export function shouldCloseCalendarPopoverAfterSelect(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}
