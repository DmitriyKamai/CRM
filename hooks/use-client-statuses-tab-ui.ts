"use client";

import { useState } from "react";

const STATUS_COLOR_PRESETS: { value: string }[] = [
  { value: "hsl(217 91% 60%)" },
  { value: "hsl(142 76% 36%)" },
  { value: "hsl(43 96% 56%)" },
  { value: "hsl(0 84% 60%)" },
  { value: "hsl(280 65% 60%)" },
  { value: "hsl(24 95% 53%)" },
  { value: "hsl(326 78% 60%)" },
  { value: "hsl(199 89% 48%)" },
  { value: "hsl(215 16% 47%)" }
];

export function useClientStatusesTabUi() {
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState<string>(
    STATUS_COLOR_PRESETS[0]?.value ?? "hsl(217 91% 60%)"
  );
  const [addStatusDialogOpen, setAddStatusDialogOpen] = useState(false);

  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusLabel, setEditingStatusLabel] = useState("");
  const [editingStatusColor, setEditingStatusColor] = useState<string>("");

  return {
    STATUS_COLOR_PRESETS,

    addStatusDialogOpen,
    setAddStatusDialogOpen,

    newStatusLabel,
    setNewStatusLabel,
    newStatusColor,
    setNewStatusColor,

    editingStatusId,
    setEditingStatusId,
    editingStatusLabel,
    setEditingStatusLabel,
    editingStatusColor,
    setEditingStatusColor
  };
}

