#!/usr/bin/env node

import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const adminConnection = [process.env.DATABASE_URL_UNPOOLED, process.env.POSTGRES_URL_NON_POOLING]
    .find((value) => Boolean(value));
if (!adminConnection) {
    throw new Error(
        "A direct Neon URL is required; pull the linked Vercel environment.",
    );
}

const databaseName = `tm_migration_test_${Date.now()}`;
const quotedDatabaseName = `"${databaseName}"`;
const adminSql = neon(adminConnection);
const testUrl = new URL(adminConnection);
testUrl.pathname = `/${databaseName}`;

let created = false;
let testFailure;

async function expectConstraintFailure(operation, label) {
    let rejected = false;
    try {
        await operation();
    } catch {
        rejected = true;
    }
    assert.equal(rejected, true, `${label} should be rejected by Postgres`);
}

try {
    await adminSql.query(`CREATE DATABASE ${quotedDatabaseName}`);
    created = true;

    const client = neon(testUrl.toString());
    const db = drizzle(client);

    await migrate(db, { migrationsFolder: "./drizzle" });
    await migrate(db, { migrationsFolder: "./drizzle" });

    const tableRows = await client`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
        order by table_name
    `;
    const actualTables = new Set(tableRows.map(({ table_name }) => table_name));
    const expectedTables = [
        "action_completions",
        "admin_audit_logs",
        "admin_role_assignments",
        "athlete_profiles",
        "auth_identities",
        "auth_sessions",
        "check_ins",
        "clipboard_messages",
        "comment_votes",
        "comments",
        "commitments",
        "forum_memberships",
        "forums",
        "password_credentials",
        "peer_support_requests",
        "post_votes",
        "posts",
        "tech_support_requests",
        "user_emails",
        "users",
    ];
    assert.deepEqual([...actualTables].sort(), expectedTables);

    const [{ id: userId }] = await client`
        insert into users (display_name)
        values ('Migration Test Admin')
        returning id
    `;
    await client`
        insert into user_emails (
            user_id, email, normalized_email, verified, is_primary, verified_at
        )
        values (
            ${userId},
            'Migration.Test@example.com',
            'migration.test@example.com',
            true,
            true,
            now()
        )
    `;
    await client`
        insert into auth_identities (
            user_id,
            provider,
            provider_account_id,
            provider_email,
            provider_email_verified
        )
        values (
            ${userId},
            'google',
            'migration-test-google-subject',
            'migration.test@example.com',
            true
        )
    `;
    await client`
        insert into admin_role_assignments (user_id, role, reason)
        values (${userId}, 'owner', 'disposable migration validation')
    `;
    await client`
        insert into check_ins (
            user_id,
            date,
            prompt_id,
            prompt_question,
            option,
            mood
        )
        values (
            ${userId},
            current_date,
            'migration-test',
            'Does the baseline enforce its invariants?',
            'yes',
            5
        )
    `;
    await client`
        insert into admin_audit_logs (
            actor_user_id,
            actor_role,
            action,
            target_type,
            target_id,
            outcome,
            request_id,
            metadata
        )
        values (
            ${userId},
            'owner',
            'migration.baseline.verify',
            'database',
            ${databaseName},
            'succeeded',
            'migration-test-request',
            '{"contains_phi": false}'::jsonb
        )
    `;

    await expectConstraintFailure(
        () =>
            client`
                insert into auth_identities (
                    user_id, provider, provider_account_id
                )
                values (
                    ${userId}, 'google', 'migration-test-google-subject'
                )
            `,
        "duplicate provider subject",
    );
    await expectConstraintFailure(
        () =>
            client`
                insert into check_ins (
                    user_id,
                    date,
                    prompt_id,
                    prompt_question,
                    option,
                    mood
                )
                values (
                    ${userId},
                    current_date,
                    'duplicate',
                    'Duplicate daily check-in?',
                    'no',
                    6
                )
            `,
        "duplicate/invalid check-in",
    );
    await expectConstraintFailure(
        () =>
            client`
                update admin_audit_logs
                set outcome = 'failed'
                where request_id = 'migration-test-request'
            `,
        "audit-log update",
    );
    await expectConstraintFailure(
        () =>
            client`
                delete from admin_audit_logs
                where request_id = 'migration-test-request'
            `,
        "audit-log delete",
    );

    const [summary] = await client`
        select
            (select count(*)::int from users) as users,
            (select count(*)::int from auth_identities) as identities,
            (select count(*)::int from admin_role_assignments) as role_grants,
            (select count(*)::int from admin_audit_logs) as audit_events
    `;
    assert.deepEqual(summary, {
        users: 1,
        identities: 1,
        role_grants: 1,
        audit_events: 1,
    });

    console.log(
        `Neon baseline verified in disposable database ${databaseName}: 20 tables, idempotent migration journal, identity/role/audit writes, constraint rejection, and immutable audit events.`,
    );
} catch (error) {
    testFailure = error;
} finally {
    if (created) {
        try {
            await adminSql.query(
                `DROP DATABASE ${quotedDatabaseName} WITH (FORCE)`,
            );
            console.log(`Removed disposable database ${databaseName}.`);
        } catch (cleanupError) {
            console.error(
                `Cleanup failed for ${databaseName}: ${cleanupError.message}`,
            );
            if (!testFailure) testFailure = cleanupError;
        }
    }
}

if (testFailure) {
    console.error(`Neon baseline verification failed: ${testFailure.message}`);
    process.exit(1);
}
