import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1709280000000 implements MigrationInterface {
  name = 'InitialSchema1709280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "btree_gist"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "role" VARCHAR(20) NOT NULL DEFAULT 'viewer',
        "avatar_url" VARCHAR(500),
        "is_active" BOOLEAN DEFAULT true,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "meeting_id" VARCHAR(256) UNIQUE NOT NULL,
        "image_url" VARCHAR(500),
        "welcome_message" TEXT,
        "max_participants" INTEGER,
        "record" BOOLEAN DEFAULT false,
        "auto_start_recording" BOOLEAN DEFAULT false,
        "mute_on_start" BOOLEAN DEFAULT false,
        "webcams_only_for_moderator" BOOLEAN DEFAULT false,
        "lock_settings" JSONB DEFAULT '{}',
        "disabled_features" TEXT[],
        "meeting_layout" VARCHAR(50) DEFAULT 'CUSTOM_LAYOUT',
        "guest_policy" VARCHAR(20) DEFAULT 'ALWAYS_ACCEPT',
        "meta" JSONB DEFAULT '{}',
        "status" VARCHAR(20) DEFAULT 'inactive',
        "created_by" UUID REFERENCES "users"("id"),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rooms_created_by" ON "rooms" ("created_by")
    `);

    await queryRunner.query(`
      CREATE TABLE "reservations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "room_id" UUID REFERENCES "rooms"("id") ON DELETE CASCADE,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "recurrence_rule" VARCHAR(255),
        "created_by" UUID REFERENCES "users"("id"),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT "no_overlap" EXCLUDE USING gist (
          "room_id" WITH =,
          tstzrange("start_time", "end_time") WITH &&
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reservations_room_id" ON "reservations" ("room_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reservations_created_by" ON "reservations" ("created_by")
    `);

    await queryRunner.query(`
      CREATE TABLE "room_participants" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "room_id" UUID REFERENCES "rooms"("id") ON DELETE CASCADE,
        "user_id" UUID REFERENCES "users"("id"),
        "bbb_internal_user_id" VARCHAR(255),
        "joined_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "left_at" TIMESTAMP WITH TIME ZONE,
        "role" VARCHAR(20) NOT NULL,
        "is_presenter" BOOLEAN DEFAULT false
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_participants_room_id" ON "room_participants" ("room_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_participants_user_id" ON "room_participants" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "recordings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "room_id" UUID REFERENCES "rooms"("id") ON DELETE SET NULL,
        "bbb_record_id" VARCHAR(255) UNIQUE NOT NULL,
        "bbb_internal_meeting_id" VARCHAR(255),
        "name" VARCHAR(255),
        "state" VARCHAR(20) DEFAULT 'processing',
        "published" BOOLEAN DEFAULT false,
        "start_time" TIMESTAMP WITH TIME ZONE,
        "end_time" TIMESTAMP WITH TIME ZONE,
        "participants_count" INTEGER,
        "playback_url" VARCHAR(500),
        "playback_format" VARCHAR(50),
        "duration_seconds" INTEGER,
        "size_bytes" BIGINT,
        "thumbnails" JSONB DEFAULT '[]',
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recordings_room_id" ON "recordings" ("room_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "recordings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "room_participants" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rooms" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "btree_gist"`);
  }
}
