"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { ru } from "date-fns/locale";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { shouldCloseCalendarPopoverAfterSelect } from "@/lib/close-calendar-popover";

export function ClientsCreateDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateClient: (payload: {
    email?: string;
    firstName: string;
    lastName: string;
    phone: string;
    notes: string;
    dateOfBirth?: string;
  }) => Promise<void>;
}) {
  const { open, onOpenChange, onCreateClient } = props;

  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [addDobPopoverOpen, setAddDobPopoverOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    notes: ""
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await onCreateClient({
        ...form,
        email: form.email.trim() || undefined,
        dateOfBirth: dob ? dob.toISOString() : undefined
      });
      setForm({ email: "", firstName: "", lastName: "", phone: "", notes: "" });
      setDob(undefined);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : "Не удалось создать клиента");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setFormError(null);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Новый клиент</DialogTitle>
          <DialogDescription>
            Укажите основные данные. Email необязателен; если указан и клиент позже зарегистрируется
            с этим email — профиль автоматически свяжется с аккаунтом.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="add-email">Email (необязательно)</Label>
            <Input
              id="add-email"
              type="email"
              placeholder="Для связки при регистрации клиента"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-firstName">Имя</Label>
            <Input
              id="add-firstName"
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-lastName">Фамилия</Label>
            <Input
              id="add-lastName"
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Дата рождения</Label>
            <Popover open={addDobPopoverOpen} onOpenChange={setAddDobPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full justify-start text-left font-normal bg-card border-input hover:bg-card/90"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {dob ? (
                    dob.toLocaleDateString("ru-RU")
                  ) : (
                    <span className="text-muted-foreground">дд.мм.гггг</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border-none bg-transparent p-0 shadow-none"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={dob}
                  onSelect={(d) => {
                    setDob(d);
                    if (shouldCloseCalendarPopoverAfterSelect()) setAddDobPopoverOpen(false);
                  }}
                  locale={ru}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="add-phone">Телефон</Label>
            <PhoneInput
              id="add-phone"
              value={form.phone}
              onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="add-notes">Заметки</Label>
            <Textarea
              id="add-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {formError && (
            <Alert variant="destructive" className="md:col-span-2">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Сохраняем..." : "Добавить клиента"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

