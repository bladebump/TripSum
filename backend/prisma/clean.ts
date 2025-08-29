import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanDatabase() {
  console.log('🧹 开始清理数据库...')

  try {
    // 按照依赖关系顺序删除数据
    console.log('删除结算记录...')
    await prisma.settlement.deleteMany()
    
    console.log('删除支出参与者...')
    await prisma.expenseParticipant.deleteMany()
    
    console.log('删除支出记录...')
    await prisma.expense.deleteMany()
    
    console.log('删除行程成员...')
    await prisma.tripMember.deleteMany()
    
    console.log('删除分类...')
    await prisma.category.deleteMany()
    
    console.log('删除行程...')
    await prisma.trip.deleteMany()
    
    console.log('删除用户...')
    await prisma.user.deleteMany()

    console.log('✅ 数据库清理完成！')
    
    // 显示清理后的统计
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.expense.count(),
      prisma.tripMember.count(),
    ])
    
    console.log('\n📊 清理后统计:')
    console.log(`  用户数: ${counts[0]}`)
    console.log(`  行程数: ${counts[1]}`)
    console.log(`  支出数: ${counts[2]}`)
    console.log(`  成员关系数: ${counts[3]}`)
    
  } catch (error) {
    console.error('❌ 清理失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行清理
cleanDatabase()
  .then(() => {
    console.log('\n💡 提示: 可以运行 "npm run seed" 重新生成测试数据')
    process.exit(0)
  })
  .catch((error) => {
    console.error('清理过程出错:', error)
    process.exit(1)
  })