-- 修复历史支出数据分类问题的SQL脚本
-- 执行前请先备份数据库

-- 1. 查看当前支出的分类分布情况
SELECT 
  COUNT(*) as total_expenses,
  COUNT(CASE WHEN category_id IS NULL THEN 1 END) as null_category_count,
  COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as has_category_count
FROM expenses;

-- 2. 查看每个行程的分类信息
SELECT 
  t.id as trip_id,
  t.name as trip_name,
  COUNT(c.id) as category_count,
  STRING_AGG(c.name || '(' || c.id || ')', ', ') as categories
FROM trips t
LEFT JOIN categories c ON c.trip_id = t.id
GROUP BY t.id, t.name
ORDER BY t.created_at DESC;

-- 3. 查看没有分类的支出详情（前10条）
SELECT 
  e.id,
  e.description,
  e.amount,
  e.expense_date,
  t.name as trip_name
FROM expenses e
JOIN trips t ON e.trip_id = t.id
WHERE e.category_id IS NULL
LIMIT 10;

-- 4. 修复方案：将所有空分类的支出设置为对应行程的"其他"分类
-- 执行前请确认数据无误
BEGIN;

-- 更新所有categoryId为NULL的支出，设置为对应行程的"其他"分类
UPDATE expenses e
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.trip_id = e.trip_id 
  AND c.name = '其他'
  LIMIT 1
)
WHERE e.category_id IS NULL
AND EXISTS (
  SELECT 1 
  FROM categories c 
  WHERE c.trip_id = e.trip_id 
  AND c.name = '其他'
);

-- 查看更新结果
SELECT 
  COUNT(*) as updated_count
FROM expenses 
WHERE category_id IS NOT NULL;

-- 如果结果正确，执行COMMIT；如果有问题，执行ROLLBACK
-- COMMIT;
-- ROLLBACK;

-- 5. 验证修复结果
SELECT 
  c.name as category_name,
  COUNT(e.id) as expense_count,
  SUM(e.amount) as total_amount
FROM expenses e
JOIN categories c ON e.category_id = c.id
GROUP BY c.id, c.name
ORDER BY expense_count DESC;

-- 6. 可选：基于描述关键词智能分类（高级修复）
-- 根据支出描述中的关键词自动分配分类
BEGIN;

-- 餐饮类关键词
UPDATE expenses e
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '餐饮' 
  LIMIT 1
)
WHERE e.category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '其他' 
  LIMIT 1
)
AND (
  e.description ILIKE '%餐%' OR 
  e.description ILIKE '%饭%' OR 
  e.description ILIKE '%吃%' OR
  e.description ILIKE '%食%' OR
  e.description ILIKE '%火锅%' OR
  e.description ILIKE '%烧烤%'
);

-- 交通类关键词
UPDATE expenses e
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '交通' 
  LIMIT 1
)
WHERE e.category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '其他' 
  LIMIT 1
)
AND (
  e.description ILIKE '%打车%' OR 
  e.description ILIKE '%滴滴%' OR 
  e.description ILIKE '%地铁%' OR
  e.description ILIKE '%公交%' OR
  e.description ILIKE '%高铁%' OR
  e.description ILIKE '%飞机%' OR
  e.description ILIKE '%车费%'
);

-- 住宿类关键词
UPDATE expenses e
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '住宿' 
  LIMIT 1
)
WHERE e.category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '其他' 
  LIMIT 1
)
AND (
  e.description ILIKE '%酒店%' OR 
  e.description ILIKE '%民宿%' OR 
  e.description ILIKE '%住宿%' OR
  e.description ILIKE '%房费%'
);

-- 娱乐类关键词
UPDATE expenses e
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '娱乐' 
  LIMIT 1
)
WHERE e.category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '其他' 
  LIMIT 1
)
AND (
  e.description ILIKE '%门票%' OR 
  e.description ILIKE '%游玩%' OR 
  e.description ILIKE '%景点%' OR
  e.description ILIKE '%电影%' OR
  e.description ILIKE '%KTV%'
);

-- 购物类关键词
UPDATE expenses e
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '购物' 
  LIMIT 1
)
WHERE e.category_id = (
  SELECT c.id FROM categories c 
  WHERE c.trip_id = e.trip_id AND c.name = '其他' 
  LIMIT 1
)
AND (
  e.description ILIKE '%购物%' OR 
  e.description ILIKE '%买%' OR 
  e.description ILIKE '%超市%' OR
  e.description ILIKE '%商场%' OR
  e.description ILIKE '%纪念品%'
);

-- 查看智能分类结果
SELECT 
  c.name as category_name,
  COUNT(e.id) as expense_count
FROM expenses e
JOIN categories c ON e.category_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;

-- 如果结果满意，执行COMMIT；否则ROLLBACK
-- COMMIT;
-- ROLLBACK;