import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const PROJECT_ID = process.env.FIREBASE_RULES_TEST_PROJECT_ID;
const ALICE = "appwrite-alice";
const BOB = "appwrite-bob";
const TODAY = "2026-08-05";

assert.match(
  PROJECT_ID ?? "",
  /^demo-[a-z0-9-]+$/,
  "Rules tests require an explicit demo-* project ID",
);
assert.match(
  process.env.FIRESTORE_EMULATOR_HOST ?? "",
  /^(127\.0\.0\.1|localhost):\d+$/,
  "Rules tests require a local Firestore emulator",
);

let testEnv;

function bridgedDb(uid, claims = {}) {
  return testEnv
    .authenticatedContext(uid, {
      auth_source: "appwrite",
      bridge_version: 1,
      ...claims,
    })
    .firestore();
}

function privateProfile(uid, displayName, email) {
  return {
    user_id: uid,
    display_name: displayName,
    email,
    sport: "football",
    athlete_status: "former",
    school: "CWRU",
    group_interest: true,
    streak: 4,
    last_checkin_date: TODAY,
    verified: false,
  };
}

function publicProfile(uid, displayName, verified = false) {
  return {
    user_id: uid,
    display_name: displayName,
    sport: "football",
    athlete_status: "former",
    school: "CWRU",
    profile_pic: "",
    verified,
  };
}

async function seedBaseline() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "profiles", ALICE), privateProfile(ALICE, "Alice Athlete", "alice@example.test")),
      setDoc(doc(db, "profiles", BOB), privateProfile(BOB, "Bob Baller", "bob@example.test")),
      setDoc(doc(db, "public_profiles", ALICE), publicProfile(ALICE, "Alice Athlete")),
      setDoc(doc(db, "public_profiles", BOB), publicProfile(BOB, "Bob Baller", true)),
      setDoc(doc(db, "checkins", "alice-checkin"), {
        user_id: ALICE,
        mood: 4,
        note: "Ready",
        ai_response: "Keep going",
        created_at: `${TODAY}T15:00:00.000Z`,
        date: TODAY,
      }),
      setDoc(doc(db, "checkins", "bob-checkin"), {
        user_id: BOB,
        mood: 3,
        note: "Okay",
        ai_response: "One step at a time",
        created_at: `${TODAY}T16:00:00.000Z`,
        date: TODAY,
      }),
      setDoc(doc(db, "completions", "alice-completion"), {
        user_id: ALICE,
        action_id: "action-1",
        completed_at: `${TODAY}T15:05:00.000Z`,
        date: TODAY,
      }),
      setDoc(doc(db, "completions", "bob-completion"), {
        user_id: BOB,
        action_id: "action-2",
        completed_at: `${TODAY}T16:05:00.000Z`,
        date: TODAY,
      }),
      setDoc(doc(db, "rooms", "global-room"), {
        room_id: "global",
        name: "Athlete Community",
        type: "global",
        school: null,
      }),
      setDoc(doc(db, "rooms", "cwru-room"), {
        room_id: "cwru",
        name: "CWRU",
        type: "school",
        school: "CWRU",
      }),
      setDoc(doc(db, "messages", "alice-message"), {
        room_id: "global",
        user_id: ALICE,
        display_name: "Alice Athlete",
        sport: "football",
        athlete_status: "former",
        content: "Hello team",
        verified: false,
        created_at: `${TODAY}T15:10:00.000Z`,
      }),
      setDoc(doc(db, "messages", "bob-message"), {
        room_id: "cwru",
        user_id: BOB,
        display_name: "Bob Baller",
        sport: "football",
        athlete_status: "former",
        content: "Hello CWRU",
        verified: true,
        created_at: `${TODAY}T16:10:00.000Z`,
      }),
      setDoc(doc(db, "notifications", "alice-notification"), {
        user_id: ALICE,
        type: "checkin",
        title: "Check-In Completed",
        body: "Nice work",
        read: false,
        timestamp: `${TODAY}T15:15:00.000Z`,
      }),
      setDoc(doc(db, "notifications", "bob-notification"), {
        user_id: BOB,
        type: "mention",
        title: "Mention",
        body: "You were mentioned",
        read: false,
        timestamp: `${TODAY}T16:15:00.000Z`,
      }),
      setDoc(doc(db, "push_tokens", ALICE), {
        user_id: ALICE,
        token: "ExponentPushToken[alice]",
        updated_at: `${TODAY}T15:20:00.000Z`,
      }),
      setDoc(doc(db, "push_tokens", BOB), {
        user_id: BOB,
        token: "ExponentPushToken[bob]",
        updated_at: `${TODAY}T16:20:00.000Z`,
      }),
      setDoc(doc(db, "support_requests", "alice-support"), {
        user_id: ALICE,
        type: "peer",
        message: "Please reach out",
        status: "pending",
        created_at: `${TODAY}T15:25:00.000Z`,
      }),
      setDoc(doc(db, "support_requests", "bob-support"), {
        user_id: BOB,
        type: "moderator",
        message: "Need moderation",
        status: "pending",
        created_at: `${TODAY}T16:25:00.000Z`,
      }),
      setDoc(doc(db, "content_reports", "alice-report"), {
        reporter_id: ALICE,
        reported_user_id: BOB,
        status: "open",
      }),
      setDoc(doc(db, "user_blocks", `${ALICE}_${BOB}`), {
        user_id: ALICE,
        blocked_user_id: BOB,
        created_at: `${TODAY}T15:30:00.000Z`,
      }),
      setDoc(doc(db, "user_blocks", `${BOB}_${ALICE}`), {
        user_id: BOB,
        blocked_user_id: ALICE,
        created_at: `${TODAY}T16:30:00.000Z`,
      }),
      setDoc(doc(db, "ai_chat_sessions", "alice-session"), {
        user_id: ALICE,
        date: TODAY,
        mood: 4,
        message_count: 1,
        created_at: `${TODAY}T15:35:00.000Z`,
        updated_at: `${TODAY}T15:35:00.000Z`,
      }),
      setDoc(doc(db, "ai_chat_sessions", "bob-session"), {
        user_id: BOB,
        date: TODAY,
        mood: 3,
        message_count: 1,
        created_at: `${TODAY}T16:35:00.000Z`,
        updated_at: `${TODAY}T16:35:00.000Z`,
      }),
      setDoc(doc(db, "ai_chat_sessions", "alice-session", "messages", "alice-ai-message"), {
        role: "user",
        content: "How should I approach today?",
        created_at: `${TODAY}T15:36:00.000Z`,
      }),
      setDoc(doc(db, "ai_chat_sessions", "bob-session", "messages", "bob-ai-message"), {
        role: "user",
        content: "What is next?",
        created_at: `${TODAY}T16:36:00.000Z`,
      }),
      setDoc(doc(db, "unknown_collection", "server-only"), { secret: true }),
    ]);
  });
}

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedBaseline();
});

after(async () => {
  await testEnv?.cleanup();
});

describe("bridge identity boundary", () => {
  test("denies anonymous, ordinary Firebase, and malformed bridge identities", async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore();
    const ordinary = testEnv.authenticatedContext(ALICE).firestore();
    const wrongSource = bridgedDb(ALICE, { auth_source: "other" });
    const wrongVersion = bridgedDb(ALICE, { bridge_version: 2 });

    for (const db of [anonymous, ordinary, wrongSource, wrongVersion]) {
      await assertFails(getDoc(doc(db, "rooms", "global-room")));
    }
  });

  test("denies anonymous reads across every known collection and nested AI messages", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const paths = [
      ["profiles", ALICE],
      ["public_profiles", ALICE],
      ["checkins", "alice-checkin"],
      ["completions", "alice-completion"],
      ["rooms", "global-room"],
      ["messages", "alice-message"],
      ["notifications", "alice-notification"],
      ["push_tokens", ALICE],
      ["support_requests", "alice-support"],
      ["content_reports", "alice-report"],
      ["user_blocks", `${ALICE}_${BOB}`],
      ["ai_chat_sessions", "alice-session"],
      ["ai_chat_sessions", "alice-session", "messages", "alice-ai-message"],
    ];

    for (const segments of paths) {
      await assertFails(getDoc(doc(db, ...segments)));
    }

    await assertFails(setDoc(doc(db, "public_profiles", "anonymous"), publicProfile("anonymous", "Anonymous")));
  });
});

describe("private ownership", () => {
  test("allows an owner to read private records and denies another bridged user", async () => {
    const alice = bridgedDb(ALICE);
    const bob = bridgedDb(BOB);
    const ownedPaths = [
      ["profiles", ALICE],
      ["checkins", "alice-checkin"],
      ["completions", "alice-completion"],
      ["notifications", "alice-notification"],
      ["push_tokens", ALICE],
      ["support_requests", "alice-support"],
      ["user_blocks", `${ALICE}_${BOB}`],
      ["ai_chat_sessions", "alice-session"],
      ["ai_chat_sessions", "alice-session", "messages", "alice-ai-message"],
    ];

    for (const segments of ownedPaths) {
      await assertSucceeds(getDoc(doc(alice, ...segments)));
      await assertFails(getDoc(doc(bob, ...segments)));
    }
  });

  test("permits valid owner creates but rejects cross-user data and invalid check-ins", async () => {
    const alice = bridgedDb(ALICE);

    await assertSucceeds(setDoc(doc(alice, "checkins", "alice-new-checkin"), {
      user_id: ALICE,
      mood: 5,
      note: "Great",
      ai_response: "Keep the momentum",
      created_at: `${TODAY}T18:00:00.000Z`,
      date: TODAY,
    }));
    await assertFails(setDoc(doc(alice, "checkins", "cross-user-checkin"), {
      user_id: BOB,
      mood: 5,
      note: "Spoofed",
      ai_response: "",
      created_at: `${TODAY}T18:00:00.000Z`,
      date: TODAY,
    }));
    await assertFails(setDoc(doc(alice, "checkins", "invalid-mood"), {
      user_id: ALICE,
      mood: 6,
      note: "Invalid",
      ai_response: "",
      created_at: `${TODAY}T18:00:00.000Z`,
      date: TODAY,
    }));
    await assertSucceeds(setDoc(doc(alice, "completions", "alice-new-completion"), {
      user_id: ALICE,
      action_id: "action-3",
      completed_at: `${TODAY}T18:05:00.000Z`,
      date: TODAY,
    }));
    await assertFails(setDoc(doc(alice, "completions", "cross-user-completion"), {
      user_id: BOB,
      action_id: "action-3",
      completed_at: `${TODAY}T18:05:00.000Z`,
      date: TODAY,
    }));
  });

  test("allows only owner-managed profile fields, never verification or streak fields", async () => {
    const alice = bridgedDb(ALICE);

    await assertSucceeds(updateDoc(doc(alice, "profiles", ALICE), { display_name: "Alice Updated" }));
    await assertFails(updateDoc(doc(alice, "profiles", ALICE), { verified: true }));
    await assertFails(updateDoc(doc(alice, "profiles", ALICE), { streak: 999 }));
    await assertFails(updateDoc(doc(alice, "profiles", BOB), { display_name: "Taken over" }));
    await assertFails(deleteDoc(doc(alice, "profiles", ALICE)));
  });
});

describe("community-safe access", () => {
  test("allows bridged community reads without exposing another private profile", async () => {
    const alice = bridgedDb(ALICE);

    const bobPublic = await assertSucceeds(getDoc(doc(alice, "public_profiles", BOB)));
    assert.equal(bobPublic.data().display_name, "Bob Baller");
    assert.equal("email" in bobPublic.data(), false);
    await assertFails(getDoc(doc(alice, "profiles", BOB)));
    await assertSucceeds(getDoc(doc(alice, "rooms", "global-room")));
    await assertSucceeds(getDoc(doc(alice, "messages", "bob-message")));
  });

  test("restricts public-profile fields and keeps verification server-controlled", async () => {
    const charlie = bridgedDb("appwrite-charlie");

    await assertSucceeds(setDoc(
      doc(charlie, "public_profiles", "appwrite-charlie"),
      publicProfile("appwrite-charlie", "Charlie Captain"),
    ));
    await assertFails(setDoc(doc(charlie, "public_profiles", "appwrite-private-leak"), {
      ...publicProfile("appwrite-private-leak", "Private Leak"),
      email: "must-not-be-public@example.test",
    }));
    await assertFails(updateDoc(doc(charlie, "public_profiles", "appwrite-charlie"), { verified: true }));
  });

  test("accepts honest messages and rejects identity, verification, and content spoofing", async () => {
    const alice = bridgedDb(ALICE);
    const validMessage = {
      room_id: "global",
      user_id: ALICE,
      display_name: "Alice Athlete",
      sport: "football",
      athlete_status: "former",
      content: "A valid community message",
      verified: false,
      created_at: `${TODAY}T19:00:00.000Z`,
    };

    await assertSucceeds(setDoc(doc(alice, "messages", "valid-message"), validMessage));
    await assertFails(setDoc(doc(alice, "messages", "spoofed-name"), {
      ...validMessage,
      display_name: "Bob Baller",
    }));
    await assertFails(setDoc(doc(alice, "messages", "spoofed-verification"), {
      ...validMessage,
      verified: true,
    }));
    await assertFails(setDoc(doc(alice, "messages", "empty-message"), {
      ...validMessage,
      content: "",
    }));
    await assertFails(updateDoc(doc(alice, "messages", "alice-message"), { content: "Edited" }));
    await assertFails(deleteDoc(doc(alice, "messages", "alice-message")));
  });
});

describe("query compatibility", () => {
  test("allows shipped owner-filtered query shapes and denies unscoped private queries", async () => {
    const alice = bridgedDb(ALICE);

    await assertSucceeds(getDocs(query(
      collection(alice, "checkins"),
      where("user_id", "==", ALICE),
      where("date", "==", TODAY),
      limit(1),
    )));
    await assertSucceeds(getDocs(query(collection(alice, "checkins"), where("user_id", "==", ALICE), limit(30))));
    await assertFails(getDocs(collection(alice, "checkins")));
    await assertFails(getDocs(query(collection(alice, "checkins"), where("user_id", "==", BOB))));

    await assertSucceeds(getDocs(query(
      collection(alice, "completions"),
      where("user_id", "==", ALICE),
      where("action_id", "==", "action-1"),
      where("date", "==", TODAY),
      limit(1),
    )));
    await assertSucceeds(getCountFromServer(query(collection(alice, "completions"), where("user_id", "==", ALICE))));
    await assertSucceeds(getDocs(query(collection(alice, "notifications"), where("user_id", "==", ALICE), where("read", "==", false))));
    await assertSucceeds(getDocs(query(collection(alice, "user_blocks"), where("user_id", "==", ALICE))));
    await assertSucceeds(getDocs(query(collection(alice, "ai_chat_sessions"), where("user_id", "==", ALICE), limit(60))));
  });

  test("allows community query shapes against rooms, messages, and public profiles", async () => {
    const alice = bridgedDb(ALICE);

    await assertSucceeds(getDocs(query(collection(alice, "rooms"), where("room_id", "==", "global"), limit(1))));
    await assertSucceeds(getDocs(query(
      collection(alice, "rooms"),
      where("type", "==", "school"),
      where("school", "==", "CWRU"),
      limit(1),
    )));
    await assertSucceeds(getDocs(query(collection(alice, "messages"), where("room_id", "==", "global"), limit(100))));
    await assertSucceeds(getDocs(query(collection(alice, "public_profiles"), where("display_name", "==", "Bob Baller"), limit(1))));
    await assertSucceeds(getDocs(query(
      collection(alice, "ai_chat_sessions", "alice-session", "messages"),
      orderBy("created_at", "asc"),
    )));

    // This shipped lookup must move to public_profiles before strict Rules ship.
    await assertFails(getDocs(query(collection(alice, "profiles"), where("display_name", "==", "Bob Baller"), limit(1))));
  });

  test("supports the existing unread-notification batch after its owner-scoped query", async () => {
    const alice = bridgedDb(ALICE);
    const unread = await assertSucceeds(getDocs(query(
      collection(alice, "notifications"),
      where("user_id", "==", ALICE),
      where("read", "==", false),
    )));
    const batch = writeBatch(alice);
    unread.docs.forEach((snapshot) => batch.update(snapshot.ref, { read: true }));
    await assertSucceeds(batch.commit());
  });
});

describe("server-only and moderation boundaries", () => {
  test("denies cross-user notifications and privileged client mutations", async () => {
    const alice = bridgedDb(ALICE);

    await assertFails(setDoc(doc(alice, "notifications", "mention-for-bob"), {
      user_id: BOB,
      type: "mention",
      title: "Mention",
      body: "Cross-user write",
      read: false,
      timestamp: `${TODAY}T20:00:00.000Z`,
    }));
    await assertFails(updateDoc(doc(alice, "support_requests", "alice-support"), { status: "resolved" }));
    await assertFails(setDoc(doc(alice, "rooms", "client-room"), { room_id: "client", type: "global" }));
    await assertFails(deleteDoc(doc(alice, "checkins", "alice-checkin")));
    await assertFails(deleteDoc(doc(alice, "completions", "alice-completion")));
    await assertFails(deleteDoc(doc(alice, "notifications", "alice-notification")));
  });

  test("allows reports and blocks only in the submitting user's constrained shape", async () => {
    const alice = bridgedDb(ALICE);

    await assertSucceeds(setDoc(doc(alice, "content_reports", "new-report"), {
      reporter_id: ALICE,
      reported_user_id: BOB,
      message_id: "bob-message",
      status: "open",
    }));
    await assertFails(getDoc(doc(alice, "content_reports", "new-report")));
    await assertFails(setDoc(doc(alice, "content_reports", "forged-report"), {
      reporter_id: BOB,
      reported_user_id: ALICE,
      status: "open",
    }));
    await assertFails(updateDoc(doc(alice, "content_reports", "alice-report"), { status: "closed" }));

    await assertSucceeds(setDoc(doc(alice, "user_blocks", `${ALICE}_appwrite-charlie`), {
      user_id: ALICE,
      blocked_user_id: "appwrite-charlie",
      created_at: `${TODAY}T20:05:00.000Z`,
    }));
    await assertFails(setDoc(doc(alice, "user_blocks", "forged-block-id"), {
      user_id: ALICE,
      blocked_user_id: BOB,
      created_at: `${TODAY}T20:05:00.000Z`,
    }));
    await assertSucceeds(deleteDoc(doc(alice, "user_blocks", `${ALICE}_${BOB}`)));
    await assertFails(deleteDoc(doc(alice, "user_blocks", `${BOB}_${ALICE}`)));
  });

  test("isolates push tokens, notifications, support, and AI sessions", async () => {
    const alice = bridgedDb(ALICE);

    await assertSucceeds(setDoc(doc(alice, "push_tokens", ALICE), {
      user_id: ALICE,
      token: "ExponentPushToken[alice-updated]",
      updated_at: `${TODAY}T20:10:00.000Z`,
    }, { merge: true }));
    await assertFails(setDoc(doc(alice, "push_tokens", BOB), {
      user_id: BOB,
      token: "stolen",
      updated_at: `${TODAY}T20:10:00.000Z`,
    }, { merge: true }));
    await assertSucceeds(updateDoc(doc(alice, "notifications", "alice-notification"), { read: true }));
    await assertFails(updateDoc(doc(alice, "notifications", "alice-notification"), { title: "Forged" }));
    await assertSucceeds(setDoc(doc(alice, "support_requests", "alice-new-support"), {
      user_id: ALICE,
      type: "peer",
      message: "Please help",
      status: "pending",
      created_at: `${TODAY}T20:15:00.000Z`,
    }));
    await assertFails(setDoc(doc(alice, "support_requests", "alice-resolved-support"), {
      user_id: ALICE,
      type: "peer",
      message: "Forged resolution",
      status: "resolved",
      created_at: `${TODAY}T20:15:00.000Z`,
    }));

    await assertSucceeds(setDoc(doc(alice, "ai_chat_sessions", "alice-new-session"), {
      user_id: ALICE,
      date: TODAY,
      mood: 4,
      message_count: 0,
      created_at: `${TODAY}T20:20:00.000Z`,
      updated_at: `${TODAY}T20:20:00.000Z`,
    }));
    await assertSucceeds(setDoc(doc(alice, "ai_chat_sessions", "alice-new-session", "messages", "message-1"), {
      role: "user",
      content: "Help me plan",
      created_at: `${TODAY}T20:21:00.000Z`,
    }));
    await assertFails(setDoc(doc(alice, "ai_chat_sessions", "bob-session", "messages", "intrusion"), {
      role: "user",
      content: "Cross-user access",
      created_at: `${TODAY}T20:21:00.000Z`,
    }));
  });

  test("proves the isolated server bypass can perform operations denied to clients", async () => {
    const alice = bridgedDb(ALICE);
    await assertFails(setDoc(doc(alice, "rooms", "server-room"), { room_id: "server", type: "global" }));
    await assertFails(setDoc(doc(alice, "notifications", "server-mention"), {
      user_id: BOB,
      type: "mention",
      read: false,
    }));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const server = context.firestore();
      await setDoc(doc(server, "rooms", "server-room"), { room_id: "server", type: "global" });
      await setDoc(doc(server, "notifications", "server-mention"), {
        user_id: BOB,
        type: "mention",
        read: false,
      });
      await updateDoc(doc(server, "profiles", ALICE), { streak: 5 });
    });

    const bob = bridgedDb(BOB);
    await assertSucceeds(getDoc(doc(alice, "rooms", "server-room")));
    await assertSucceeds(getDoc(doc(bob, "notifications", "server-mention")));
    assert.equal((await getDoc(doc(alice, "profiles", ALICE))).data().streak, 5);
  });
});

describe("default deny", () => {
  test("denies reads and writes to unknown collections for bridged users", async () => {
    const alice = bridgedDb(ALICE);
    await assertFails(getDoc(doc(alice, "unknown_collection", "server-only")));
    await assertFails(setDoc(doc(alice, "unknown_collection", "client-write"), { value: true }));
    await assertFails(getDocs(collection(alice, "unknown_collection")));
  });
});
