"use client";

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import clsx from "clsx";

import { findUniversities } from "@/lib/core/university-search";
import type { UsUniversity } from "@/lib/core/us-universities";

type UniversityFinderProps = {
    value: string;
    onChange: (value: string) => void;
    inputClassName?: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
};

export default function UniversityFinder({
    value,
    onChange,
    inputClassName,
    label = "University",
    placeholder = "Find your university",
    required = false,
}: UniversityFinderProps) {
    const inputId = useId();
    const listboxId = `${inputId}-listbox`;
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [universities, setUniversities] = useState<readonly UsUniversity[] | null>(null);
    const [directoryUnavailable, setDirectoryUnavailable] = useState(false);
    const deferredValue = useDeferredValue(value);
    const results = useMemo(
        () => findUniversities(universities ?? [], deferredValue),
        [deferredValue, universities],
    );
    const searchIsStale = deferredValue !== value;
    const activeUniversity = open && !searchIsStale ? results[activeIndex] : undefined;

    useEffect(() => {
        let active = true;
        if (typeof window !== "undefined") {
            import("@/lib/core/us-universities")
                .then(({ US_UNIVERSITIES }) => {
                    if (active) setUniversities(US_UNIVERSITIES);
                })
                .catch(() => {
                    if (active) setDirectoryUnavailable(true);
                });
        }
        return () => {
            active = false;
        };
    }, []);

    const selectUniversity = (university: UsUniversity) => {
        onChange(university[1]);
        setOpen(false);
        setActiveIndex(0);
    };

    return (
        <div className="relative block">
            <label htmlFor={inputId} className="sr-only">
                {label}
            </label>
            <input
                id={inputId}
                type="text"
                role="combobox"
                required={required}
                autoComplete="organization"
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={open && Boolean(value.trim())}
                aria-activedescendant={
                    activeUniversity ? `${inputId}-option-${activeUniversity[0]}` : undefined
                }
                placeholder={placeholder}
                value={value}
                onFocus={() => setOpen(Boolean(value.trim()))}
                onBlur={() => setOpen(false)}
                onChange={(event) => {
                    onChange(event.target.value);
                    setOpen(Boolean(event.target.value.trim()));
                    setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" && results.length) {
                        event.preventDefault();
                        setOpen(true);
                        setActiveIndex((index) => (index + 1) % results.length);
                    } else if (event.key === "ArrowUp" && results.length) {
                        event.preventDefault();
                        setOpen(true);
                        setActiveIndex((index) => (index - 1 + results.length) % results.length);
                    } else if (event.key === "Enter" && activeUniversity) {
                        event.preventDefault();
                        selectUniversity(activeUniversity);
                    } else if (event.key === "Escape") {
                        setOpen(false);
                    }
                }}
                className={clsx(inputClassName, "pr-11")}
            />
            <Search
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-[1.15rem] h-4 w-4 text-text-tertiary"
            />

            {open && value.trim() && (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-label="U.S. universities"
                    className="liquid-glass absolute z-40 mt-2 max-h-[42svh] w-full overflow-y-auto overscroll-contain rounded-2xl border border-border-subtle bg-bg-elevated p-1.5 shadow-[0_20px_55px_rgba(0,0,0,0.28)]"
                >
                    {searchIsStale ? (
                        <p className="px-3 py-3 text-sm text-text-secondary">Searching…</p>
                    ) : !universities && !directoryUnavailable ? (
                        <p className="px-3 py-3 text-sm text-text-secondary">
                            Loading university directory…
                        </p>
                    ) : results.length ? (
                        results.map((university, index) => {
                            const [scorecardId, name, city, state, isMainCampus] = university;
                            const selected = name === value;
                            return (
                                <button
                                    key={scorecardId}
                                    id={`${inputId}-option-${scorecardId}`}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => selectUniversity(university)}
                                    className={clsx(
                                        "flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition",
                                        index === activeIndex
                                            ? "bg-volt/12 text-text-primary"
                                            : "text-text-secondary hover:bg-bg-surface hover:text-text-primary",
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold leading-snug">
                                            {name}
                                        </span>
                                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-tertiary">
                                            <span>{city}, {state}</span>
                                            {isMainCampus === 1 && (
                                                <span className="rounded-full bg-bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                                                    Main campus
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    {selected && (
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <p className="px-3 py-3 text-sm leading-relaxed text-text-secondary">
                            {directoryUnavailable
                                ? "The directory is unavailable. You can still continue with the name you entered."
                                : "No matching university. You can still continue with the name you entered."}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
