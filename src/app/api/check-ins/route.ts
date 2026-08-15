import { requireUser } from "@/lib/athlete-api/auth";
import { clipboardReply } from "@/lib/athlete-api/clipboard-ai";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { todayISO } from "@/lib/core/journey-math";
import {
  createCheckIn,
  createProductNotification,
  getProductProfile,
  listCheckIns,
} from "@/lib/firestore-product";

const output = (row: Awaited<ReturnType<typeof listCheckIns>>[number]) => ({
  id: row.id,
  date: row.date,
  prompt_id: row.prompt_id,
  option: row.option,
  journal: row.journal,
  user_id: row.user_id,
  mood: row.mood,
  note: row.note,
  ai_response: row.ai_response,
  created_at: row.created_at,
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json((await listCheckIns(user.id)).slice(0, 90).map(output));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const mobileMood = body.mood;
    if (
      mobileMood !== undefined &&
      (!Number.isInteger(mobileMood) || (mobileMood as number) < 1 || (mobileMood as number) > 5)
    ) {
      throw new ApiError(422, "mood must be an integer from 1 to 5");
    }
    const promptId =
      stringField(body, "prompt_id", { optional: true, min: 1, max: 240 }) ??
      "mobile-mood";
    const promptQuestion =
      stringField(body, "prompt_question", { optional: true, min: 1, max: 4_000 }) ??
      "How are you feeling today?";
    const option =
      stringField(body, "option", { optional: true, min: 1, max: 1_000 }) ??
      String(mobileMood ?? 3);
    const journal =
      stringField(body, "journal", { optional: true, max: 20_000 }) ??
      stringField(body, "note", { optional: true, max: 20_000 });
    if (body.ambient !== undefined && (typeof body.ambient !== "object" || Array.isArray(body.ambient))) {
      throw new ApiError(422, "ambient must be an object");
    }
    const requestedPersona =
      stringField(body, "persona", { optional: true, max: 40 }) ?? "friend";
    const persona =
      ({
        chill: "friend",
        motivator: "hype",
        huddle: "hype",
      } as Record<string, string>)[requestedPersona] ?? requestedPersona;
    const coaching = await clipboardReply(
      [
        {
          role: "user",
          text: `Today's check-in is ${mobileMood ?? option}/5.${journal ? ` They shared: ${journal}` : ""}`,
        },
      ],
      persona,
      user.id,
    );
    const created = await createCheckIn(user.id, {
      date: todayISO(),
      prompt_id: promptId,
      prompt_question: promptQuestion,
      option,
      journal: journal || null,
      mood: typeof mobileMood === "number" ? mobileMood : Number(option) || 3,
      ai_response: coaching.text,
    });
    if (!created) throw new ApiError(409, "Already checked in today");
    const mood = created.mood;
    const moodLabel =
      ({ 1: "Struggling", 2: "Tough", 3: "Okay", 4: "Good", 5: "Great" } as Record<number, string>)[mood] ||
      "Okay";
    const notificationBody =
      mood >= 4
        ? `You checked in feeling ${moodLabel}. Keep that momentum going!`
        : mood <= 2
          ? `You checked in feeling ${moodLabel}. Tough days build resilience.`
          : `You checked in feeling ${moodLabel}. Every check-in counts.`;
    await createProductNotification(user.id, {
      type: "checkin",
      title: "Check-In Completed",
      body: notificationBody,
      icon: "heart",
    });
    const streak = (await getProductProfile(user.id))?.streak || 0;
    if ([3, 7, 14, 21, 30, 60, 90].includes(streak)) {
      await createProductNotification(user.id, {
        type: "streak",
        title: `${streak}-Day Streak!`,
        body:
          streak >= 30
            ? `${streak} days strong. That's elite-level consistency.`
            : streak >= 7
              ? `${streak} days in a row. You're building real momentum.`
              : `${streak}-day streak started. The foundation is being laid.`,
        icon: "flame",
      });
    }
    return Response.json(output(created));
  } catch (error) {
    return jsonError(error);
  }
}
