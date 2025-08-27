import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('开始填充种子数据...')

  // 创建测试用户
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      },
    }),
    prisma.user.create({
      data: {
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      },
    }),
    prisma.user.create({
      data: {
        username: 'charlie',
        email: 'charlie@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
      },
    }),
    prisma.user.create({
      data: {
        username: 'diana',
        email: 'diana@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana',
      },
    }),
  ])

  console.log(`创建了 ${users.length} 个用户`)

  // 创建测试行程
  const trip = await prisma.trip.create({
    data: {
      name: '云南七日游',
      description: '和朋友们一起去云南旅游，游览大理、丽江、香格里拉',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-07'),
      initialFund: 20000,
      currency: 'CNY',
      createdBy: users[0].id,
      members: {
        create: [
          { userId: users[0].id, role: 'admin' },
          { userId: users[1].id, role: 'member' },
          { userId: users[2].id, role: 'member' },
          { userId: users[3].id, role: 'member' },
        ],
      },
      categories: {
        create: [
          { name: '餐饮', icon: '🍽️', color: '#FF6B6B', isDefault: true },
          { name: '交通', icon: '🚗', color: '#4ECDC4', isDefault: true },
          { name: '住宿', icon: '🏨', color: '#45B7D1', isDefault: true },
          { name: '娱乐', icon: '🎮', color: '#96CEB4', isDefault: true },
          { name: '购物', icon: '🛒', color: '#FFEAA7', isDefault: true },
          { name: '门票', icon: '🎫', color: '#A29BFE', isDefault: true },
          { name: '收入', icon: '💰', color: '#00B894', isDefault: true },
          { name: '其他', icon: '📦', color: '#DFE6E9', isDefault: true },
        ],
      },
    },
    include: {
      categories: true,
    },
  })

  console.log(`创建了行程: ${trip.name}`)

  // 添加虚拟成员示例
  const virtualMembers = await Promise.all([
    prisma.tripMember.create({
      data: {
        tripId: trip.id,
        displayName: '小李',
        isVirtual: true,
        createdBy: users[0].id,
        role: 'member'
      }
    }),
    prisma.tripMember.create({
      data: {
        tripId: trip.id,
        displayName: '小王',
        isVirtual: true,
        createdBy: users[0].id,
        role: 'member'
      }
    })
  ])

  console.log(`添加了 ${virtualMembers.length} 个虚拟成员`)

  // 获取类别ID
  const categories = await prisma.category.findMany({
    where: { tripId: trip.id },
  })
  const categoryMap: { [key: string]: string } = {}
  categories.forEach((c) => {
    categoryMap[c.name] = c.id
  })

  // 创建测试支出记录
  const expenses = [
    {
      amount: 1200,
      categoryId: categoryMap['交通'],
      payerId: users[0].id,
      description: '机场到酒店的出租车费',
      expenseDate: new Date('2024-03-01'),
      participants: users.map((u) => ({
        userId: u.id,
        shareAmount: 300,
      })),
    },
    {
      amount: 800,
      categoryId: categoryMap['餐饮'],
      payerId: users[1].id,
      description: '第一天晚餐 - 云南特色菜',
      expenseDate: new Date('2024-03-01'),
      participants: users.map((u) => ({
        userId: u.id,
        shareAmount: 200,
      })),
    },
    {
      amount: 2400,
      categoryId: categoryMap['住宿'],
      payerId: users[0].id,
      description: '大理古城客栈 - 两晚',
      expenseDate: new Date('2024-03-02'),
      participants: users.map((u) => ({
        userId: u.id,
        shareAmount: 600,
      })),
    },
    {
      amount: 600,
      categoryId: categoryMap['门票'],
      payerId: users[2].id,
      description: '崇圣寺三塔门票',
      expenseDate: new Date('2024-03-02'),
      participants: users.map((u) => ({
        userId: u.id,
        shareAmount: 150,
      })),
    },
    {
      amount: 1500,
      categoryId: categoryMap['娱乐'],
      payerId: users[3].id,
      description: '洱海游船',
      expenseDate: new Date('2024-03-03'),
      participants: users.map((u) => ({
        userId: u.id,
        shareAmount: 375,
      })),
    },
    {
      amount: 450,
      categoryId: categoryMap['餐饮'],
      payerId: users[1].id,
      description: '午餐 - 白族三道茶',
      expenseDate: new Date('2024-03-03'),
      participants: users.slice(0, 3).map((u) => ({
        userId: u.id,
        shareAmount: 150,
      })),
    },
    {
      amount: 2000,
      categoryId: categoryMap['购物'],
      payerId: users[2].id,
      description: '特产和纪念品',
      expenseDate: new Date('2024-03-04'),
      participants: [
        { userId: users[0].id, shareAmount: 500 },
        { userId: users[1].id, shareAmount: 600 },
        { userId: users[2].id, shareAmount: 900 },
      ],
    },
    // 添加收入记录示例
    {
      amount: -500, // 负数表示收入
      categoryId: categoryMap['收入'],
      payerId: users[0].id,
      description: '退还的门票费用',
      expenseDate: new Date('2024-03-05'),
      participants: users.slice(0, 2).map((u) => ({
        userId: u.id,
        shareAmount: -250, // 收入也需要是负数
      })),
    },
    {
      amount: -300,
      categoryId: categoryMap['收入'],
      payerId: users[1].id,
      description: '餐厅多收的钱退回',
      expenseDate: new Date('2024-03-06'),
      participants: users.map((u) => ({
        userId: u.id,
        shareAmount: -75,
      })),
    },
  ]

  for (const expenseData of expenses) {
    const { participants, ...expense } = expenseData
    await prisma.expense.create({
      data: {
        tripId: trip.id,
        ...expense,
        createdBy: expense.payerId,
        participants: {
          create: participants,
        },
      },
    })
  }

  console.log(`创建了 ${expenses.length} 条记录（包括 2 条收入记录）`)

  // 创建第二个行程（已完成）
  const completedTrip = await prisma.trip.create({
    data: {
      name: '北京周末游',
      description: '周末去北京玩两天',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-17'),
      initialFund: 5000,
      currency: 'CNY',
      createdBy: users[1].id,
      members: {
        create: [
          { userId: users[1].id, role: 'admin' },
          { userId: users[0].id, role: 'member' },
        ],
      },
      categories: {
        create: [
          { name: '餐饮', icon: '🍽️', color: '#FF6B6B', isDefault: true },
          { name: '交通', icon: '🚗', color: '#4ECDC4', isDefault: true },
          { name: '门票', icon: '🎫', color: '#A29BFE', isDefault: true },
        ],
      },
    },
  })

  console.log(`创建了已完成的行程: ${completedTrip.name}`)

  console.log('种子数据填充完成！')
  console.log('\n测试账号:')
  console.log('Email: alice@example.com, Password: password123')
  console.log('Email: bob@example.com, Password: password123')
  console.log('Email: charlie@example.com, Password: password123')
  console.log('Email: diana@example.com, Password: password123')
}

main()
  .catch((e) => {
    console.error('种子数据填充失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })