import type { UsUniversity } from "./us-universities";

function normalizedUniversityName(value: string | null | undefined): string {
    return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function universitySelectionChanged(
    currentUniversity: string | null | undefined,
    nextUniversity: string | null | undefined,
): boolean {
    return normalizedUniversityName(currentUniversity) !== normalizedUniversityName(nextUniversity);
}

const SEARCH_STOP_WORDS = new Set(["and", "at", "in", "of", "the"]);
const universitySearchIndex = new Map<
    number,
    { normalizedName: string; acronym: string; normalizedLocation: string }
>();

export const normalizeUniversitySearch = (value: string) =>
    value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const acronymFor = (normalizedName: string) =>
    normalizedName
        .split(" ")
        .filter((word) => word && !SEARCH_STOP_WORDS.has(word))
        .map((word) => word[0])
        .join("");

const searchFieldsFor = (university: UsUniversity) => {
    const cached = universitySearchIndex.get(university[0]);
    if (cached) return cached;

    const [, name, city, state] = university;
    const normalizedName = normalizeUniversitySearch(name);
    const fields = {
        normalizedName,
        acronym: acronymFor(normalizedName),
        normalizedLocation: normalizeUniversitySearch(`${city} ${state}`),
    };
    universitySearchIndex.set(university[0], fields);
    return fields;
};

const matchScore = (university: UsUniversity, query: string) => {
    const { normalizedName, acronym, normalizedLocation } = searchFieldsFor(university);
    if (normalizedName === query) return 0;
    if (normalizedName.startsWith(query)) return 1;
    if (acronym.startsWith(query.replaceAll(" ", ""))) return 2;

    const nameWords = normalizedName.split(" ");
    const queryWords = query.split(" ");
    if (queryWords.every((part) => nameWords.some((word) => word.startsWith(part)))) {
        return 3;
    }
    if (normalizedName.includes(query)) return 4;

    if (normalizedLocation.startsWith(query) || normalizedLocation.includes(` ${query}`)) {
        return 5;
    }
    return null;
};

export const findUniversities = (
    universities: readonly UsUniversity[],
    rawQuery: string,
    limit = 8,
): UsUniversity[] => {
    const query = normalizeUniversitySearch(rawQuery);
    if (!query || limit <= 0) return [];

    const matches: { university: UsUniversity; score: number }[] = [];
    for (const university of universities) {
        const score = matchScore(university, query);
        if (score !== null) matches.push({ university, score });
    }

    return matches
        .sort(
            (left, right) =>
                left.score - right.score ||
                right.university[4] - left.university[4] ||
                left.university[1].localeCompare(right.university[1]) ||
                left.university[3].localeCompare(right.university[3]),
        )
        .slice(0, limit)
        .map(({ university }) => university);
};
