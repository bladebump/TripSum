import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateExpensePayers() {
  console.log('开始迁移Expense付款人数据...')
  
  try {
    // 获取所有有payerId但没有payerMemberId的支出记录
    const expenses = await prisma.expense.findMany({
      where: {
        payerId: { not: null },
        payerMemberId: null
      },
      include: {
        trip: true
      }
    })
    
    console.log(`找到 ${expenses.length} 条需要迁移的支出记录`)
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const expense of expenses) {
      try {
        // 查找对应的TripMember记录
        const tripMember = await prisma.tripMember.findUnique({
          where: {
            tripId_userId: {
              tripId: expense.tripId,
              userId: expense.payerId!
            }
          }
        })
        
        if (tripMember) {
          // 更新expense记录
          await prisma.expense.update({
            where: { id: expense.id },
            data: { payerMemberId: tripMember.id }
          })
          
          migratedCount++
          console.log(`✓ 迁移支出 ${expense.id}: payerId ${expense.payerId} -> payerMemberId ${tripMember.id}`)
        } else {
          // 如果找不到对应的TripMember，可能需要创建
          console.warn(`⚠ 警告: 支出 ${expense.id} 的付款人 ${expense.payerId} 在行程 ${expense.tripId} 中没有对应的TripMember记录`)
          
          // 尝试查找用户信息
          const user = await prisma.user.findUnique({
            where: { id: expense.payerId! }
          })
          
          if (user) {
            // 创建TripMember记录
            const newMember = await prisma.tripMember.create({
              data: {
                tripId: expense.tripId,
                userId: expense.payerId!,
                role: 'member',
                isActive: true
              }
            })
            
            // 更新expense记录
            await prisma.expense.update({
              where: { id: expense.id },
              data: { payerMemberId: newMember.id }
            })
            
            migratedCount++
            console.log(`✓ 为用户 ${user.username} 创建了TripMember并迁移支出 ${expense.id}`)
          } else {
            errorCount++
            console.error(`✗ 错误: 支出 ${expense.id} 的付款人 ${expense.payerId} 不存在`)
          }
        }
      } catch (error) {
        errorCount++
        console.error(`✗ 迁移支出 ${expense.id} 时出错:`, error)
      }
    }
    
    console.log('\n迁移完成!')
    console.log(`成功迁移: ${migratedCount} 条记录`)
    console.log(`失败: ${errorCount} 条记录`)
    
    // 检查是否所有记录都已迁移
    const remainingCount = await prisma.expense.count({
      where: {
        payerId: { not: null },
        payerMemberId: null
      }
    })
    
    if (remainingCount > 0) {
      console.warn(`\n⚠ 警告: 仍有 ${remainingCount} 条记录未迁移`)
    } else {
      console.log('\n✅ 所有记录已成功迁移！')
    }
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 运行迁移
migrateExpensePayers()
  .then(() => {
    console.log('迁移脚本执行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error)
    process.exit(1)
  })