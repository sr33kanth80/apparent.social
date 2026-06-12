import { AnimatePresence, motion } from 'framer-motion';
import { Search, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface Action {
  id: string;
  label: string;
  icon: ReactNode;
  description?: string;
  short?: string;
  end?: string;
}

interface ActionSearchBarProps {
  actions: Action[];
  className?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  onActionSelect?: (action: Action) => void;
}

const useDebounce = <T,>(value: T, delay = 180): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};

const container = {
  hidden: { opacity: 0, height: 0, y: -4 },
  show: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: {
      height: { duration: 0.22 },
      opacity: { duration: 0.16 },
      staggerChildren: 0.035,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -4,
    transition: {
      height: { duration: 0.16 },
      opacity: { duration: 0.12 },
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.16 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.12 } },
};

export function ActionSearchBar({
  actions,
  className,
  label = 'Search Apparent',
  placeholder = 'Search founders, signals, deal flow',
  value,
  onValueChange,
  onActionSelect,
}: ActionSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(value);

  const filteredActions = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return actions;
    }

    return actions.filter((action) =>
      [action.label, action.description, action.end].some((field) =>
        field?.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [actions, debouncedQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectAction = (action: Action) => {
    onActionSelect?.(action);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className={cn('relative w-full max-w-2xl', className)}>
      <label className="sr-only" htmlFor="dashboard-action-search">
        {label}
      </label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="dashboard-action-search"
          type="search"
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setIsFocused(true);
          }}
          onClick={() => setIsFocused(true)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 150)}
          placeholder={placeholder}
          className="h-9 rounded-full border-black/10 bg-white pl-4 pr-10 text-sm shadow-none focus-visible:border-black/20 focus-visible:ring-black/10"
        />
        <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
          <AnimatePresence mode="popLayout" initial={false}>
            {value.trim() ? (
              <motion.div
                key="send"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <Send className="h-4 w-4 text-gray-400" />
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <Search className="h-4 w-4 text-gray-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl shadow-black/10"
            variants={container}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <motion.ul className="p-1">
              {filteredActions.map((action) => (
                <motion.li key={action.id} variants={item} layout>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-[#f6f3f1]"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectAction(action)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-gray-500">{action.icon}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-950">{action.label}</span>
                        {action.description && (
                          <span className="block truncate text-xs text-gray-500">{action.description}</span>
                        )}
                      </span>
                    </span>
                    <span className="ml-3 flex shrink-0 items-center gap-2">
                      {action.short && <span className="text-xs text-gray-400">{action.short}</span>}
                      {action.end && <span className="text-xs text-gray-400">{action.end}</span>}
                    </span>
                  </button>
                </motion.li>
              ))}
              {filteredActions.length === 0 && (
                <motion.li variants={item} className="px-3 py-3 text-sm text-gray-500">
                  No Apparent actions found.
                </motion.li>
              )}
            </motion.ul>
            <div className="flex items-center justify-between border-t border-black/10 px-3 py-2 text-xs text-gray-500">
              <span>Type to filter signals and feed</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
