import { useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

/**
 * Fixed overlay header: city picker, local time, search affordance and the two
 * submission actions.
 *
 * The city list is derived from whatever the live data actually contains rather
 * than a fixed menu, so it can never offer a city with nothing behind it.
 */

const useLocalTime = () => {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    // Ticking once a minute is enough for an "h:mm" readout and avoids a
    // needless re-render every second.
    const id = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
};

type Props = {
  cities: string[];
  activeCity: string;
  onCityChange: (city: string) => void;
  onOpenSearch: () => void;
  onAddCompany: () => void;
  onReportProblem: () => void;
};

export function JobsHeader({
  cities,
  activeCity,
  onCityChange,
  onOpenSearch,
  onAddCompany,
  onReportProblem,
}: Props) {
  const localTime = useLocalTime();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-4">
      <div className="pointer-events-auto mx-auto flex max-w-[1400px] flex-nowrap items-center gap-2.5 overflow-x-auto rounded-xl border border-black/8 bg-white/85 px-3 py-2.5 shadow-[0_6px_28px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <span className="font-serif text-[15px] font-semibold tracking-tight text-black">
          Where we work
        </span>

        <div className="relative">
          <select
            value={activeCity}
            onChange={(event) => onCityChange(event.target.value)}
            aria-label="Pick a city"
            className="w-[150px] appearance-none truncate rounded-lg border border-black/10 bg-white py-1.5 pl-2.5 pr-7 text-xs text-black/75 outline-none transition-colors hover:border-black/20"
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
        </div>

        <span className="hidden text-xs tabular-nums text-black/45 sm:inline">{localTime}</span>

        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-black/20"
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-black/35" />
          <span className="truncate text-xs text-black/35">Search a company or area…</span>
          <kbd className="ml-auto hidden shrink-0 rounded border border-black/12 px-1.5 py-0.5 text-[10px] text-black/40 sm:block">
            {isMac ? '⌘' : 'Ctrl'}K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddCompany}
            className="rounded-lg bg-[#1d9bf0] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            Add your company
          </button>
          <button
            type="button"
            onClick={onReportProblem}
            className="rounded-lg border border-black/12 px-3 py-1.5 text-xs text-black/65 transition-colors hover:bg-black/[0.04] hover:text-black"
          >
            Report a problem
          </button>
        </div>
      </div>
    </header>
  );
}
