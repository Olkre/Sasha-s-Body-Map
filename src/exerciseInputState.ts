export const shouldClearBodyMapForInputChange = (
  estimateStatus: "idle" | "estimating" | "complete",
  hasActiveActivations: boolean,
) => estimateStatus === "complete" && hasActiveActivations;

type NamedSuggestion = { name: string };

export const getAutocompleteSuggestions = <T extends NamedSuggestion>(
  input: string,
  suggestions: readonly T[],
): T[] => {
  const search = input.trim().toLocaleLowerCase();
  if (!search) return [];

  return suggestions.filter(({ name }) => {
    const candidate = name.trim().toLocaleLowerCase();
    return candidate.startsWith(search) && candidate.length > search.length;
  });
};

export const getAutocompleteSuggestion = <T extends NamedSuggestion>(
  input: string,
  suggestions: readonly T[],
): T | null => {
  return getAutocompleteSuggestions(input, suggestions)[0] ?? null;
};
