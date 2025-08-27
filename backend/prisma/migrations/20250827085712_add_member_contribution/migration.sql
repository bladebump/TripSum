-- DropForeignKey
ALTER TABLE "expense_participants" DROP CONSTRAINT "expense_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trip_members" DROP CONSTRAINT "trip_members_user_id_fkey";

-- AlterTable
ALTER TABLE "trip_members" ADD COLUMN     "contribution" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
