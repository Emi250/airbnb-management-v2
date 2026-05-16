import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZES = { sm: 28, md: 36, lg: 72 } as const;

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  return (
    <Image
      src="/logo-refugio.jpeg"
      alt="Refugio del Corazón"
      width={px}
      height={px}
      priority={size === "lg"}
      className={cn(
        "rounded-full object-cover ring-1 ring-border bg-[oklch(0.97_0.02_85)]",
        className
      )}
    />
  );
}
