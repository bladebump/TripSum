-- 简单修复脚本：将所有NULL分类设置为"其他"

-- 1. 查看当前状态
SELECT 
  COUNT(*) as total_expenses,
  COUNT(CASE WHEN category_id IS NULL THEN 1 END) as null_category_count
FROM expenses;

-- 2. 执行修复
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

-- 3. 验证结果
SELECT 
  c.name as category_name,
  COUNT(e.id) as expense_count,
  ROUND(CAST(SUM(e.amount) AS numeric), 2) as total_amount
FROM expenses e
LEFT JOIN categories c ON e.category_id = c.id
GROUP BY c.id, c.name
ORDER BY expense_count DESC;