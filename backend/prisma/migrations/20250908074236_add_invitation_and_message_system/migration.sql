/*
  Warnings:

  - You are about to drop the column `user_id` on the `expense_participants` table. All the data in the column will be lost.
  - Made the column `trip_member_id` on table `expense_participants` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "InviteType" AS ENUM ('REPLACE', 'ADD');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TRIP_INVITATION', 'TRIP_INVITATION_ACCEPTED', 'TRIP_INVITATION_REJECTED', 'TRIP_MEMBER_JOINED', 'TRIP_MEMBER_LEFT', 'TRIP_DELETED', 'EXPENSE_CREATED', 'EXPENSE_UPDATED', 'EXPENSE_DELETED', 'EXPENSE_MENTIONED', 'SETTLEMENT_REMINDER', 'SETTLEMENT_RECEIVED', 'SETTLEMENT_CONFIRMED', 'SYSTEM_ANNOUNCEMENT', 'SYSTEM_MAINTENANCE', 'FEATURE_UPDATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MessageCategory" AS ENUM ('SYSTEM', 'TRIP', 'EXPENSE', 'SOCIAL', 'NOTIFICATION');

-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "NotificationFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- DropForeignKey
ALTER TABLE "expense_participants" DROP CONSTRAINT "expense_participants_trip_member_id_fkey";

-- DropForeignKey
ALTER TABLE "expense_participants" DROP CONSTRAINT "expense_participants_user_id_fkey";

-- DropIndex
DROP INDEX "expense_participants_expense_id_user_id_key";

-- AlterTable
ALTER TABLE "expense_participants" DROP COLUMN "user_id",
ALTER COLUMN "trip_member_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "trip_members" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "trip_invitations" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "invited_user_id" TEXT NOT NULL,
    "invite_type" "InviteType" NOT NULL,
    "target_member_id" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "type" "MessageType" NOT NULL,
    "category" "MessageCategory" NOT NULL,
    "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "actions" JSONB,
    "related_entity" JSONB,
    "status" "MessageStatus" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "type" "MessageType" NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
    "title_template" TEXT NOT NULL,
    "content_template" TEXT NOT NULL,
    "default_actions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL,
    "channels" JSONB NOT NULL DEFAULT '["inApp"]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" "NotificationFrequency" NOT NULL DEFAULT 'INSTANT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_invitations_invited_user_id_status_idx" ON "trip_invitations"("invited_user_id", "status");

-- CreateIndex
CREATE INDEX "trip_invitations_trip_id_idx" ON "trip_invitations"("trip_id");

-- CreateIndex
CREATE INDEX "messages_recipient_id_status_idx" ON "messages"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "messages_type_category_idx" ON "messages"("type", "category");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_type_key" ON "message_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_type_locale_key" ON "message_templates"("type", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "message_preferences_user_id_message_type_key" ON "message_preferences"("user_id", "message_type");

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_trip_member_id_fkey" FOREIGN KEY ("trip_member_id") REFERENCES "trip_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_invitations" ADD CONSTRAINT "trip_invitations_target_member_id_fkey" FOREIGN KEY ("target_member_id") REFERENCES "trip_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_preferences" ADD CONSTRAINT "message_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
