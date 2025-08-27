-- AlterTable
ALTER TABLE "trip_members" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "trip_members" ADD COLUMN "is_virtual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "trip_members" ADD COLUMN "display_name" VARCHAR(50);
ALTER TABLE "trip_members" ADD COLUMN "created_by" TEXT;

-- AlterTable
ALTER TABLE "expense_participants" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "expense_participants" ADD COLUMN "trip_member_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "expense_participants_expense_id_trip_member_id_key" ON "expense_participants"("expense_id", "trip_member_id");

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_trip_member_id_fkey" FOREIGN KEY ("trip_member_id") REFERENCES "trip_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;