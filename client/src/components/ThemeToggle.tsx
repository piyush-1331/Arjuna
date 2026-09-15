import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Monitor, Check } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "dropdown" | "compact";
}

export default function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "compact") {
    return (
      <button
        onClick={toggleTheme}
        className={`relative inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
          className || ""
        }`}
        title={`Current mode: ${theme} (click to toggle)`}
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500 transition-transform rotate-0 scale-100" />
        )}
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className={`relative h-9 w-9 rounded-xl border border-black/5 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs ${
          className || ""
        }`}
        title={`Theme: ${theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"} (click to toggle)`}
        aria-label="Toggle light and dark theme"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4 text-amber-400" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </Button>
    );
  }

  // Dropdown mode (Full Light / Dark / System selector)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-2 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${
            className || ""
          }`}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4 text-amber-400" />
          ) : (
            <Sun className="h-4 w-4 text-amber-500" />
          )}
          <span className="capitalize">{theme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === "light" && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-amber-400" />
            <span>Dark</span>
          </div>
          {theme === "dark" && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-400" />
            <span>System</span>
          </div>
          {theme === "system" && <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
