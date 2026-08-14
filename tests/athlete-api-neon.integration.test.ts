import { beforeAll, describe, expect, it } from "vitest";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { adminAuditLogs, users } from "@/lib/db/schema";

const enabled = process.env.RUN_NEON_ATHLETE_API_TEST === "1";
const suite = enabled ? describe : describe.skip;

function request(path: string, method = "GET", body?: object, token?: string) {
  return new Request(`http://local.test${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

suite("athlete API on disposable Neon", () => {
  let token = "";
  let postId = "";
  let athleteId = "";

  beforeAll(() => {
    process.env.VERCEL_ENV = "development";
    process.env.AUTO_VERIFY = "true";
    process.env.JWT_SECRET = "integration-test-secret-32-bytes-minimum";
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
  });

  it("registers, normalizes login, exposes me, and rejects duplicates", async () => {
    const register = await import("@/app/api/auth/register/route");
    const login = await import("@/app/api/auth/login/route");
    const me = await import("@/app/api/auth/me/route");
    const created = await register.POST(
      request("/api/auth/register", "POST", {
        email: "Athlete@Test.dev",
        password: "password123",
        display_name: "Athlete",
        status: "competing",
      }),
    );
    expect(created.status).toBe(200);
    const body = await json(created);
    token = body.access_token as string;
    athleteId = (body.user as Record<string, unknown>).id as string;
    expect((body.user as Record<string, unknown>).status).toBe("competing");
    const signedIn = await login.POST(
      request("/api/auth/login", "POST", {
        email: "  ATHLETE@test.DEV ",
        password: "password123",
      }),
    );
    expect(signedIn.status).toBe(200);
    expect(
      (
        await json(
          await me.GET(request("/api/auth/me", "GET", undefined, token)),
        )
      ).email,
    ).toBe("Athlete@Test.dev");
    const duplicate = await register.POST(
      request("/api/auth/register", "POST", {
        email: "athlete@TEST.dev",
        password: "password123",
        display_name: "Duplicate",
      }),
    );
    expect(duplicate.status).toBe(400);
  });

  it("persists intake, path commitment, and week-scoped action toggles", async () => {
    const intake = await import("@/app/api/profile/intake/route");
    const profile = await import("@/app/api/profile/route");
    const gamePlan = await import("@/app/api/game-plan/route");
    const commit = await import("@/app/api/game-plan/commit/route");
    const toggle = await import("@/app/api/game-plan/actions/toggle/route");
    const intakeResponse = await intake.POST(
      request(
        "/api/profile/intake",
        "POST",
        {
          sport: "Soccer",
          role: "Captain",
          years: "4",
          relied_on:
            "Film study and helping every teammate understand our set plays",
          favorite: "The team",
          community: "solo",
        },
        token,
      ),
    );
    expect(intakeResponse.status).toBe(200);
    expect((await json(intakeResponse)).intake_answers).toMatchObject({
      community: "solo",
    });
    const updated = await profile.PATCH(
      request(
        "/api/profile",
        "PATCH",
        {
          display_name: "New Name",
          status: "transitioned",
          headline: "Former midfielder → product manager",
        },
        token,
      ),
    );
    expect(await json(updated)).toMatchObject({
      display_name: "New Name",
      status: "transitioned",
    });
    expect(
      await json(
        await profile.PATCH(
          request("/api/profile", "PATCH", { headline: "" }, token),
        ),
      ),
    ).toMatchObject({ headline: null });
    const committed = await commit.POST(
      request(
        "/api/game-plan/commit",
        "POST",
        { path_id: "consulting" },
        token,
      ),
    );
    expect((await json(committed)).committed_path_id).toBe("consulting");
    const toggled = await toggle.POST(
      request(
        "/api/game-plan/actions/toggle",
        "POST",
        { action_id: "wellness-therapy" },
        token,
      ),
    );
    expect((await json(toggled)).completed_action_ids).toContain(
      "wellness-therapy",
    );
    const invalid = await toggle.POST(
      request(
        "/api/game-plan/actions/toggle",
        "POST",
        { action_id: "a1" },
        token,
      ),
    );
    expect(invalid.status).toBe(400);
    expect(
      (
        await json(
          await gamePlan.GET(
            request("/api/game-plan", "GET", undefined, token),
          ),
        )
      ).day,
    ).toBe(1);
  });

  it("enforces one check-in per calendar day and allows same-day edits", async () => {
    const checkIns = await import("@/app/api/check-ins/route");
    const today = await import("@/app/api/check-ins/today/route");
    const created = await checkIns.POST(
      request(
        "/api/check-ins",
        "POST",
        {
          prompt_id: "p1",
          prompt_question: "How are you?",
          option: "Flat",
          journal: "meh",
        },
        token,
      ),
    );
    expect(created.status).toBe(200);
    expect(
      (
        await checkIns.POST(
          request(
            "/api/check-ins",
            "POST",
            {
              prompt_id: "p1",
              prompt_question: "How are you?",
              option: "Better",
            },
            token,
          ),
        )
      ).status,
    ).toBe(409);
    const edited = await today.PATCH(
      request(
        "/api/check-ins/today",
        "PATCH",
        {
          option: "Better",
          journal: "turned around",
        },
        token,
      ),
    );
    expect(await json(edited)).toMatchObject({
      option: "Better",
      journal: "turned around",
    });
  });

  it("uses the offline Clipboard fallback and clears persisted history", async () => {
    const chat = await import("@/app/api/clipboard/chat/route");
    const history = await import("@/app/api/clipboard/history/route");
    const reply = await chat.POST(
      request(
        "/api/clipboard/chat",
        "POST",
        { message: "hey", persona: "analyst" },
        token,
      ),
    );
    expect((await json(reply)).options).toHaveLength(3);
    expect(
      (
        (
          await json(
            await history.GET(
              request("/api/clipboard/history", "GET", undefined, token),
            ),
          )
        ).messages as unknown[]
      ).length,
    ).toBe(2);
    expect(
      (
        await json(
          await history.DELETE(
            request("/api/clipboard/history", "DELETE", undefined, token),
          ),
        )
      ).cleared,
    ).toBe(2);
  });

  it("seeds forums, personalizes membership/feed, comments, and toggles a FK vote", async () => {
    const forumList = await import("@/app/api/community/forums/route");
    const membership =
      await import("@/app/api/community/forums/[forum_id]/membership/route");
    const forumPosts =
      await import("@/app/api/community/forums/[forum_id]/posts/route");
    const feed = await import("@/app/api/community/feed/route");
    const comments =
      await import("@/app/api/community/posts/[post_id]/comments/route");
    const vote = await import("@/app/api/community/vote/route");
    const forums = await forumList.GET(
      request("/api/community/forums", "GET", undefined, token),
    );
    expect((await forums.json()) as unknown[]).toHaveLength(9);
    const context = {
      params: Promise.resolve({ forum_id: "path-consulting" }),
    };
    expect(
      (
        await json(
          await membership.POST(
            request("/membership", "POST", undefined, token),
            context,
          ),
        )
      ).joined,
    ).toBe(true);
    const created = await forumPosts.POST(
      request(
        "/posts",
        "POST",
        {
          flair: "WIN",
          title: "Signed the offer",
          body: "Starting next week",
        },
        token,
      ),
      context,
    );
    expect(created.status).toBe(200);
    postId = (await json(created)).id as string;
    const joinedFeed = await feed.GET(
      request(
        "/api/community/feed?scope=joined&sort=new",
        "GET",
        undefined,
        token,
      ),
    );
    expect(
      ((await joinedFeed.json()) as { id: string }[]).map((post) => post.id),
    ).toContain(postId);
    const postContext = { params: Promise.resolve({ post_id: postId }) };
    expect(
      (
        await comments.POST(
          request("/comments", "POST", { body: "Congratulations" }, token),
          postContext,
        )
      ).status,
    ).toBe(200);
    expect(
      await json(
        await vote.POST(
          request(
            "/vote",
            "POST",
            {
              target_type: "post",
              target_id: postId,
            },
            token,
          ),
        ),
      ),
    ).toEqual({ upvotes: 1, voted: true });
    expect(
      await json(
        await vote.POST(
          request(
            "/vote",
            "POST",
            {
              target_type: "post",
              target_id: postId,
            },
            token,
          ),
        ),
      ),
    ).toEqual({ upvotes: 0, voted: false });
  });

  it("persists support, computes artifacts, and revokes the bearer token", async () => {
    const artifacts = await import("@/app/api/artifacts/route");
    const tech = await import("@/app/api/support/tech/route");
    const logout = await import("@/app/api/auth/logout/route");
    const me = await import("@/app/api/auth/me/route");
    expect(
      (
        await tech.POST(
          request(
            "/api/support/tech",
            "POST",
            { message: "Export button is stuck" },
            token,
          ),
        )
      ).status,
    ).toBe(200);
    const artifactRows = await artifacts.GET(
      request("/api/artifacts", "GET", undefined, token),
    );
    expect(
      ((await artifactRows.json()) as { id: string; unlocked: boolean }[]).find(
        (row) => row.id === "skill_map",
      )?.unlocked,
    ).toBe(true);
    expect(
      (await logout.POST(request("/api/auth/logout", "POST", undefined, token)))
        .status,
    ).toBe(200);
    expect(
      (await me.GET(request("/api/auth/me", "GET", undefined, token))).status,
    ).toBe(401);
  });

  it("serves admin views from Postgres and appends transactional audits", async () => {
    const {
      getAdminCommunityData,
      listAdminActionCompletions,
      listAdminCheckIns,
      listAdminSupportRequests,
      listAdminUsers,
    } = await import("@/lib/admin-data");
    const { auditedAdminMutation } = await import("@/lib/admin-mutation");

    expect((await listAdminUsers()).map((user) => user.id)).toContain(
      athleteId,
    );
    expect(
      (await listAdminCheckIns()).some((row) => row.user_id === athleteId),
    ).toBe(true);
    expect(
      (await listAdminActionCompletions()).some(
        (row) => row.user_id === athleteId,
      ),
    ).toBe(true);
    expect(
      (await listAdminSupportRequests()).some(
        (row) => row.user_id === athleteId && row.type === "tech",
      ),
    ).toBe(true);
    expect((await getAdminCommunityData()).totalMessages).toBe(2);

    await auditedAdminMutation(
      new Request("http://local.test/admin", {
        headers: { "x-request-id": "admin-integration-test" },
      }),
      {
        action: "test.admin_mutation",
        targetType: "user",
        targetId: athleteId,
      },
      (tx) =>
        tx
          .update(users)
          .set({ headline: "Audited update" })
          .where(eq(users.id, athleteId))
          .returning({ id: users.id }),
    );
    const [audit] = await getDb()
      .select()
      .from(adminAuditLogs)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(1);
    expect(audit).toMatchObject({
      action: "test.admin_mutation",
      targetId: athleteId,
      outcome: "succeeded",
      requestId: "admin-integration-test",
    });
  });

  it("enforces suspension and chat-ban changes against already-issued tokens", async () => {
    const register = await import("@/app/api/auth/register/route");
    const me = await import("@/app/api/auth/me/route");
    const forumPosts =
      await import("@/app/api/community/forums/[forum_id]/posts/route");
    const created = await json(
      await register.POST(
        request("/api/auth/register", "POST", {
          email: "moderation@test.dev",
          password: "password123",
          display_name: "Moderation",
        }),
      ),
    );
    const moderationToken = created.access_token as string;
    const userId = (created.user as Record<string, unknown>).id as string;
    await getDb()
      .update(users)
      .set({ chatBanned: true })
      .where(eq(users.id, userId));
    const blockedPost = await forumPosts.POST(
      request(
        "/posts",
        "POST",
        { flair: "WIN", title: "Blocked post", body: "Should not publish" },
        moderationToken,
      ),
      { params: Promise.resolve({ forum_id: "path-consulting" }) },
    );
    expect(blockedPost.status).toBe(403);
    expect(
      (await me.GET(request("/api/auth/me", "GET", undefined, moderationToken)))
        .status,
    ).toBe(200);
    await getDb()
      .update(users)
      .set({ suspended: true })
      .where(eq(users.id, userId));
    const blockedMe = await me.GET(
      request("/api/auth/me", "GET", undefined, moderationToken),
    );
    expect(blockedMe.status).toBe(403);
    expect((await json(blockedMe)).detail).toBe("Account suspended");
  });
});
