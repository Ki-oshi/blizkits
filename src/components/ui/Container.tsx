import { ReactNode } from "react";
import { cn } from "@/utils/cn";

export default function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}