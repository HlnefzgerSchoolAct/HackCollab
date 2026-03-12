import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

/**
 * Button variants derived from @hackclub/theme buttons.
 * - primary: solid red with card shadow, scale on hover
 * - outline: transparent with border, Hack Club style
 * - ghost: minimal, no border or shadow
 * - cta: gradient orange→red (from theme.buttons.cta)
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center font-bold transition-transform duration-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 hover:shadow-lg",
        outline:
          "rounded-full border-2 border-current bg-transparent text-primary hover:scale-105 hover:shadow-lg",
        ghost:
          "rounded-md bg-transparent text-foreground hover:bg-sunken",
        cta: "rounded-full bg-gradient-to-br from-hc-orange to-hc-red text-white shadow-md hover:scale-105 hover:shadow-lg",
        destructive:
          "rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-105 hover:shadow-lg",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg leading-title",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
