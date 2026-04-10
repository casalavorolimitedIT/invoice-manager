"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = React.useState(false);
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="relative">
      <InputPrimitive
        type={inputType}
        data-slot="input"
        className={cn(
          "h-12 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          isPassword && "pr-9",
          className,
        )}
        {...props}
      />
      {isPassword ? (
        <button
          type="button"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={() => setShowPassword((prev) => !prev)}
          disabled={props.disabled}
          className="absolute right-0 top-0 flex h-12 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none"
        >
          <HugeiconsIcon
            icon={showPassword ? ViewOffSlashIcon : ViewIcon}
            strokeWidth={2}
            className="size-4"
          />
        </button>
      ) : null}
    </div>
  );
}

export { Input };
