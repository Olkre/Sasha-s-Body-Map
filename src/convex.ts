type ConvexActionResponse<T> = {
  status: "success" | "error";
  value?: T;
  errorMessage?: string;
};

export type LandingMuscleEstimate = {
  activations: Array<{
    muscleGroupId: string;
    activationPercent: number;
  }>;
  source?: "cache" | "generated" | "exercise";
  rawResponse?: string;
  reasoning?: string;
  diagnostic?: string;
};

export type LandingExerciseSuggestion = {
  name: string;
  activations: Array<{
    muscleName: string;
    activationPercent: number;
  }>;
};

export class ConvexApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ConvexApiError";
  }
}

export async function estimateLandingMuscles(name: string, signal?: AbortSignal): Promise<LandingMuscleEstimate> {
  const deploymentUrl = import.meta.env.VITE_CONVEX_URL?.trim().replace(/\/$/, "");
  if (!deploymentUrl) {
    throw new ConvexApiError(
      "Muscle estimates are not configured. Set VITE_CONVEX_URL for this site.",
      0,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${deploymentUrl}/api/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        path: "exerciseEstimation:estimateLandingMuscles",
        format: "convex_encoded_json",
        args: [{ name }],
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ConvexApiError("Couldn’t reach the muscle-estimate service. Please try again.", 0);
  }

  const payload = await response.json().catch(() => null) as ConvexActionResponse<LandingMuscleEstimate> | null;
  if (!response.ok || payload?.status !== "success" || !payload.value) {
    throw new ConvexApiError(
      payload?.errorMessage?.trim() || "Couldn’t estimate this exercise. Please try again.",
      response.status,
    );
  }

  if (payload.value.diagnostic?.trim()) {
    throw new ConvexApiError(payload.value.diagnostic.trim(), response.status);
  }

  return payload.value;
}

export async function searchLandingExercises(search: string): Promise<LandingExerciseSuggestion[]> {
  const deploymentUrl = import.meta.env.VITE_CONVEX_URL?.trim().replace(/\/$/, "");
  if (!deploymentUrl || !search.trim()) return [];

  try {
    const response = await fetch(`${deploymentUrl}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "exerciseEstimation:searchLandingExercises",
        format: "convex_encoded_json",
        args: [{ search }],
      }),
    });
    const payload = await response.json().catch(() => null) as ConvexActionResponse<LandingExerciseSuggestion[]> | null;
    return response.ok && payload?.status === "success" && Array.isArray(payload.value)
      ? payload.value
      : [];
  } catch {
    // Autocomplete is progressive enhancement; estimating remains available.
    return [];
  }
}
