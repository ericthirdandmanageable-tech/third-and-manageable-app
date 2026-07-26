"use client";

import { useCallback, useEffect, useState } from "react";

import { api, authStorage } from "./api";
import {
    dayNumberFromDates,
    streakFromDates,
    todayISO,
} from "@/lib/core/journey-math";

/*
 * Check-in state — one hook for both worlds: the backend when signed in,
 * localStorage when browsing offline. Same shape either way, so CheckIn and
 * Progress never branch on the source. History drives the streak, the day
 * number, and the 90-day arc fill.
 */

export interface CheckInEntry {
    date: string; // YYYY-MM-DD
    promptId: string;
    option: string;
    journal?: string | null;
}

const LOCAL_KEY = "tm_checkins_v1";

const loadLocal = (): CheckInEntry[] => {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        /* corrupted state → start clean */
    }
    return [];
};

const saveLocal = (entries: CheckInEntry[]) =>
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));

/** Where history comes from: the backend when signed in, storage otherwise. */
const loadHistory = async (): Promise<CheckInEntry[] | null> => {
    if (!authStorage.getToken()) return loadLocal();
    const rows = await api.checkInHistory();
    return rows
        ? rows.map((r) => ({
              date: r.date,
              promptId: r.prompt_id,
              option: r.option,
              journal: r.journal,
          }))
        : null; // request failed — keep whatever is on screen
};

export const useCheckIns = () => {
    // Empty and loading until mounted — there is no storage to read during the
    // server render, and seeding from it would desync hydration.
    const [history, setHistory] = useState<CheckInEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const rows = await loadHistory();
        if (rows) setHistory(rows);
        setLoading(false);
    }, []);

    useEffect(() => {
        // `cancelled` guards the unmount race: the athlete can leave the page
        // before the request lands, and the state update would then apply to a
        // component that no longer exists.
        let cancelled = false;
        (async () => {
            const rows = await loadHistory();
            if (cancelled) return;
            if (rows) setHistory(rows);
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const today = history.find((e) => e.date === todayISO()) ?? null;
    const dates = history.map((e) => e.date);
    const streak = streakFromDates(dates);
    const dayNumber = dayNumberFromDates(dates);

    /** Returns 'saved' | 'already' — a second submit on the same day is never a fake success. */
    const submit = async (
        promptId: string,
        question: string,
        option: string,
        journal?: string,
    ) => {
        if (today) return "already" as const;
        const entry: CheckInEntry = {
            date: todayISO(),
            promptId,
            option,
            journal: journal ?? null,
        };
        if (authStorage.getToken()) {
            const res = await api.submitCheckIn(promptId, question, option, journal);
            if (!res) return "already" as const; // 409 or offline — either way, don't inflate the moment
            setHistory((h) => [entry, ...h]);
        } else {
            const next = [entry, ...loadLocal()];
            saveLocal(next);
            setHistory(next);
        }
        return "saved" as const;
    };

    /** Edit today's answer — the day isn't over until it's over. */
    const editToday = async (option: string, journal?: string) => {
        if (authStorage.getToken()) {
            const res = await api.updateTodaysCheckIn(option, journal);
            if (!res) return false;
            setHistory((h) =>
                h.map((e) =>
                    e.date === todayISO() ? { ...e, option, journal: journal ?? null } : e,
                ),
            );
        } else {
            const next = loadLocal().map((e) =>
                e.date === todayISO() ? { ...e, option, journal: journal ?? null } : e,
            );
            saveLocal(next);
            setHistory(next);
        }
        return true;
    };

    return { today, history, streak, dayNumber, loading, submit, editToday, refresh };
};
