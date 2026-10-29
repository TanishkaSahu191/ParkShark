import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, glass = true, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-2xl transition-all duration-200 ${
          glass
            ? "bg-white/85 dark:bg-[#0b2a4a]/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 shadow-lg shadow-black/5"
            : "bg-white dark:bg-[#0d2847] border border-slate-200 dark:border-slate-800 shadow-md"
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
