"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function SortableRow({ id, label }: { id: string; label: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border border-border bg-card px-2 py-2 text-sm",
        isDragging && "z-10 opacity-90 shadow-md"
      )}
    >
      <button
        type="button"
        className="touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Перетащить"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 shrink-0" />
      </button>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </div>
  );
}

export function DataTableColumnOrderDialog({
  open,
  onOpenChange,
  itemIds,
  labels,
  onApply
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: string[];
  labels: Record<string, string>;
  onApply: (reorderedIds: string[]) => void;
}) {
  const [working, setWorking] = React.useState<string[]>(itemIds);

  React.useEffect(() => {
    if (open) setWorking([...itemIds]);
  }, [open, itemIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = working.indexOf(String(active.id));
      const newIndex = working.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      setWorking(arrayMove(working, oldIndex, newIndex));
    },
    [working]
  );

  const handleApply = () => {
    onApply(working);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Порядок колонок</DialogTitle>
          <DialogDescription>
            Перетащите строки за иконку. Колонки выбора и поиска остаются слева.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[min(60vh,24rem)] space-y-2 overflow-y-auto py-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={working} strategy={verticalListSortingStrategy}>
              {working.map(id => (
                <SortableRow key={id} id={id} label={labels[id] ?? id} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" onClick={handleApply}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
