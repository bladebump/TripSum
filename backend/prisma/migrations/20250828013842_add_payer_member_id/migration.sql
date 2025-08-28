-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_payer_id_fkey";

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "payer_member_id" TEXT,
ALTER COLUMN "payer_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payer_member_id_fkey" FOREIGN KEY ("payer_member_id") REFERENCES "trip_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
