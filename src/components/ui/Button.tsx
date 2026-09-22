import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "brand" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50";
    
    const variants = {
      primary: "bg-neutral-900 text-white hover:bg-neutral-800",
      brand: "bg-pink-500 text-white hover:bg-pink-600",
      outline: "border border-neutral-200 bg-transparent hover:bg-neutral-100 text-neutral-900",
      ghost: "bg-transparent hover:bg-neutral-100 text-neutral-900",
    };

    const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-6 text-base", lg: "h-14 px-8 text-lg" };

    return (
      <button ref={ref} className={cn(baseStyles, variants[variant], sizes[size], className)} {...props} />
    );
  }
);
Button.displayName = "Button";
export default Button;