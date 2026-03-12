import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warning" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        {
          "bg-primary text-primary-foreground": variant === "default",
          "border border-current bg-transparent": variant === "outline",
          "bg-success text-white": variant === "success",
          "bg-warning text-white": variant === "warning",
          "bg-destructive text-destructive-foreground": variant === "destructive",
        },
        className,
      )}
      {...props}
    />
  );
}
