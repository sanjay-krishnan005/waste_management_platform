import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/80 to-muted bg-[length:200%_100%]", className)}
      {...props}
    />
  );
}
