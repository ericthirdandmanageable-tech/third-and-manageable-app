import { mobileApi } from "@/lib/mobile-api";
import type { CareerIntakeAnswers } from "@/constants/career-intake";

type ProfileIntake = {
  intake_answers?: Record<string, string>;
  intake_done?: boolean;
};

type CommitmentResponse = {
  committed_path_id: string | null;
};

export async function getCareerIntake(): Promise<CareerIntakeAnswers | null> {
  const profile = await mobileApi<ProfileIntake>("/profile");
  const answers = profile.intake_answers;
  if (!profile.intake_done || !answers) return null;
  return {
    role: answers.role ?? "",
    favorite: answers.favorite ?? "",
    reliedOn: answers.relied_on ?? "",
  };
}

export async function saveCareerIntake(
  answers: CareerIntakeAnswers,
  sport: string,
): Promise<void> {
  await mobileApi("/profile/intake", {
    method: "POST",
    body: {
      sport: sport || "other",
      role: answers.role,
      years: "Not specified",
      relied_on: answers.reliedOn,
      favorite: answers.favorite,
      community: "solo",
    },
  });
}

export async function getCommittedPath(): Promise<string | null> {
  return (await mobileApi<CommitmentResponse>("/game-plan")).committed_path_id;
}

export async function setCommittedPath(pathId: string | null): Promise<void> {
  await mobileApi<CommitmentResponse>("/game-plan/commit", {
    method: "POST",
    body: { path_id: pathId },
  });
}
