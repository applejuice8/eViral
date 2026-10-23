import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";
type Size = "sm" | "default" | "lg" | "icon";

const variantClasses: Record<Variant, string> = {
  default:
    "bg-brand-600 text-white shadow-xs hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  outline:
    "border border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-50",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  destructive:
    "bg-danger-600 text-white shadow-xs hover:bg-danger-700 disabled:bg-gray-200 disabled:text-gray-400",
  success:
    "bg-success-600 text-white shadow-xs hover:bg-success-700 disabled:bg-gray-200 disabled:text-gray-400",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  default: "h-9 px-4 text-sm rounded-lg gap-2",
  lg: "h-10 px-5 text-sm rounded-lg gap-2",
  icon: "h-9 w-9 rounded-lg",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed disabled:shadow-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}
