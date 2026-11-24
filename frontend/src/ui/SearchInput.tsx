interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  busy?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search…", busy, autoFocus, ...rest }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={rest["aria-label"] || placeholder}
        className="w-full rounded-md border border-strong bg-surface py-2 pl-9 pr-9 text-sm text-content placeholder:text-content-subtle focus:border-primary focus:outline-none"
      />
      {busy ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
          <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-content-subtle border-t-transparent" />
        </span>
      ) : value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-content-subtle hover:text-content hover:bg-surface-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      ) : null}
    </div>
  );
}

export default SearchInput;
