"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
};

export function ResetFiltersButton({
  onClick,
  disabled = false,
  className,
  label = "Restablecer filtros",
}: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(className)}
      aria-label={label}
    >
      <RotateCcw className="h-4 w-4" />
      {label}
    </Button>
  );
}
