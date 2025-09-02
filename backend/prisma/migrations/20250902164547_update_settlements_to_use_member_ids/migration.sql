-- 更新 settlements 表，使用 member_id 代替 user_id

-- 1. 添加新的列
ALTER TABLE "settlements" ADD COLUMN "from_member_id" TEXT;
ALTER TABLE "settlements" ADD COLUMN "to_member_id" TEXT;

-- 2. 数据迁移：将现有的 user_id 转换为对应的 member_id
UPDATE "settlements" 
SET "from_member_id" = (
    SELECT tm.id 
    FROM "trip_members" tm 
    WHERE tm.user_id = "settlements"."from_user_id" 
    AND tm.trip_id = "settlements"."trip_id"
    AND tm.is_active = true
    LIMIT 1
);

UPDATE "settlements" 
SET "to_member_id" = (
    SELECT tm.id 
    FROM "trip_members" tm 
    WHERE tm.user_id = "settlements"."to_user_id" 
    AND tm.trip_id = "settlements"."trip_id"
    AND tm.is_active = true
    LIMIT 1
);

-- 3. 删除可能的无效记录（找不到对应 member_id 的记录）
DELETE FROM "settlements" 
WHERE "from_member_id" IS NULL OR "to_member_id" IS NULL;

-- 4. 设置新列为 NOT NULL
ALTER TABLE "settlements" ALTER COLUMN "from_member_id" SET NOT NULL;
ALTER TABLE "settlements" ALTER COLUMN "to_member_id" SET NOT NULL;

-- 5. 删除旧的外键约束
ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_from_user_id_fkey";
ALTER TABLE "settlements" DROP CONSTRAINT IF EXISTS "settlements_to_user_id_fkey";

-- 6. 删除旧的列
ALTER TABLE "settlements" DROP COLUMN "from_user_id";
ALTER TABLE "settlements" DROP COLUMN "to_user_id";

-- 7. 添加新的外键约束
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_member_id_fkey" 
    FOREIGN KEY ("from_member_id") REFERENCES "trip_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_member_id_fkey" 
    FOREIGN KEY ("to_member_id") REFERENCES "trip_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;