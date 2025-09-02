import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'
import { calculationService } from './calculation.service'
import dayjs from 'dayjs'

const prisma = new PrismaClient()

class ExportService {
  async exportTripToExcel(tripId: string): Promise<Buffer> {
    // 获取行程详细数据
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          include: {
            user: true,
            paidExpenses: {
              include: {
                participants: {
                  include: {
                    tripMember: {
                      include: {
                        user: true
                      }
                    }
                  }
                },
                category: true
              }
            },
            expenseParticipant: {
              include: {
                expense: {
                  include: {
                    payerMember: {
                      include: {
                        user: true
                      }
                    },
                    category: true
                  }
                }
              }
            }
          }
        },
        expenses: {
          include: {
            payerMember: {
              include: {
                user: true
              }
            },
            participants: {
              include: {
                tripMember: {
                  include: {
                    user: true
                  }
                }
              }
            },
            category: true
          },
          orderBy: {
            expenseDate: 'desc'
          }
        },
        settlements: {
          include: {
            fromMember: {
              include: {
                user: true
              }
            },
            toMember: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!trip) {
      throw new Error('行程不存在')
    }

    // 计算所有成员的余额
    const balanceCalculations = await calculationService.calculateBalances(tripId)
    const settlements = await calculationService.calculateSettlement(tripId)

    // 转换为Map格式以便后续使用
    const memberBalances = new Map<string, number>()
    balanceCalculations.forEach(calc => {
      memberBalances.set(calc.memberId, calc.balance)
    })

    // 创建工作簿
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'TripSum'
    workbook.created = new Date()

    // 1. 总览表
    this.createOverviewSheet(workbook, trip, memberBalances)

    // 2. 支出明细表
    this.createExpensesSheet(workbook, trip)

    // 3. 基金缴纳表
    this.createFundContributionsSheet(workbook, trip)

    // 4. 成员财务表
    this.createMemberFinancesSheet(workbook, trip, balanceCalculations)

    // 5. 结算方案表
    this.createSettlementSheet(workbook, settlements)

    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }

  private createOverviewSheet(
    workbook: ExcelJS.Workbook,
    trip: any,
    memberBalances: Map<string, number>
  ) {
    const sheet = workbook.addWorksheet('行程总览')
    
    // 设置列宽
    sheet.columns = [
      { header: '项目', key: 'item', width: 20 },
      { header: '数值', key: 'value', width: 30 },
      { header: '说明', key: 'description', width: 40 }
    ]

    // 计算统计数据
    const totalExpenses = trip.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0)
    const fundExpenses = trip.expenses.filter((exp: any) => exp.isPaidFromFund).reduce((sum: number, exp: any) => sum + Number(exp.amount), 0)
    const memberExpenses = totalExpenses - fundExpenses
    const totalContributions = trip.members.reduce((sum: number, member: any) => sum + (Number(member.contribution) || 0), 0)
    const fundBalance = totalContributions - fundExpenses

    // 添加数据
    const data = [
      { item: '行程名称', value: trip.name, description: '' },
      { item: '创建时间', value: dayjs(trip.createdAt).format('YYYY-MM-DD HH:mm'), description: '' },
      { item: '参与人数', value: `${trip.members.length} 人`, description: trip.members.map((m: any) => m.displayName || m.user?.username || '虚拟成员').join('、') },
      { item: '货币单位', value: trip.currency || 'CNY', description: '' },
      { item: '', value: '', description: '' },
      { item: '基金池总额', value: `¥${totalContributions.toFixed(2)}`, description: '所有成员缴纳的基金总和' },
      { item: '基金已支出', value: `¥${fundExpenses.toFixed(2)}`, description: '从基金池支付的费用' },
      { item: '基金余额', value: `¥${fundBalance.toFixed(2)}`, description: '基金池剩余金额' },
      { item: '', value: '', description: '' },
      { item: '总支出', value: `¥${totalExpenses.toFixed(2)}`, description: '行程所有费用总和' },
      { item: '成员垫付', value: `¥${memberExpenses.toFixed(2)}`, description: '成员个人垫付的费用' },
      { item: '支出笔数', value: `${trip.expenses.length} 笔`, description: '' },
      { item: '', value: '', description: '' },
      { item: '待结算人数', value: `${[...memberBalances.values()].filter(b => Math.abs(b) > 0.01).length} 人`, description: '需要收款或付款的人数' }
    ]

    sheet.addRows(data)

    // 设置样式
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
  }

  private createExpensesSheet(workbook: ExcelJS.Workbook, trip: any) {
    const sheet = workbook.addWorksheet('支出明细')
    
    sheet.columns = [
      { header: '消费日期', key: 'date', width: 15 },
      { header: '描述', key: 'description', width: 30 },
      { header: '分类', key: 'category', width: 12 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '付款人', key: 'payer', width: 15 },
      { header: '付款方式', key: 'paymentType', width: 12 },
      { header: '参与人', key: 'participants', width: 30 },
      { header: '人均', key: 'perPerson', width: 10 },
      { header: '备注', key: 'note', width: 20 }
    ]

    const data = trip.expenses.map((expense: any) => {
      const participantNames = expense.participants.map((p: any) => 
        p.tripMember.displayName || p.tripMember.user?.username || '虚拟成员'
      ).join('、')
      
      return {
        date: dayjs(expense.expenseDate || expense.createdAt).format('YYYY-MM-DD'),
        description: expense.description,
        category: expense.category?.name || '其他',
        amount: `¥${Number(expense.amount).toFixed(2)}`,
        payer: expense.payerMember?.displayName || expense.payerMember?.user?.username || '虚拟成员',
        paymentType: expense.isPaidFromFund ? '基金支付' : '个人垫付',
        participants: participantNames,
        perPerson: `¥${(Number(expense.amount) / expense.participants.length).toFixed(2)}`,
        note: expense.description || ''
      }
    })

    sheet.addRows(data)

    // 设置样式
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // 设置金额列为货币格式
    sheet.getColumn('amount').numFmt = '¥#,##0.00'
    sheet.getColumn('perPerson').numFmt = '¥#,##0.00'
  }

  private createFundContributionsSheet(workbook: ExcelJS.Workbook, trip: any) {
    const sheet = workbook.addWorksheet('基金缴纳')
    
    sheet.columns = [
      { header: '成员', key: 'member', width: 20 },
      { header: '缴纳金额', key: 'contribution', width: 15 },
      { header: '缴纳比例', key: 'percentage', width: 12 },
      { header: '角色', key: 'role', width: 10 },
      { header: '状态', key: 'status', width: 10 }
    ]

    const totalContributions = trip.members.reduce((sum: number, member: any) => 
      sum + (Number(member.contribution) || 0), 0
    )

    const data = trip.members.map((member: any) => {
      const contribution = Number(member.contribution) || 0
      const percentage = totalContributions > 0 
        ? ((contribution / totalContributions) * 100).toFixed(1) 
        : '0.0'
      
      return {
        member: member.displayName || member.user?.username || '虚拟成员',
        contribution: `¥${contribution.toFixed(2)}`,
        percentage: `${percentage}%`,
        role: member.role === 'ADMIN' ? '管理员' : '成员',
        status: contribution > 0 ? '已缴纳' : '未缴纳'
      }
    })

    sheet.addRows(data)

    // 添加合计行
    sheet.addRow({
      member: '合计',
      contribution: `¥${totalContributions.toFixed(2)}`,
      percentage: '100.0%',
      role: '',
      status: ''
    })

    // 设置样式
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    
    const lastRow = sheet.lastRow
    if (lastRow) {
      lastRow.font = { bold: true }
      lastRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      }
    }
  }

  private createMemberFinancesSheet(
    workbook: ExcelJS.Workbook,
    trip: any,
    balanceCalculations: any[]
  ) {
    const sheet = workbook.addWorksheet('成员财务')
    
    sheet.columns = [
      { header: '成员', key: 'member', width: 20 },
      { header: '基金缴纳', key: 'contribution', width: 15 },
      { header: '个人支付', key: 'paid', width: 15 },
      { header: '应分摊', key: 'share', width: 15 },
      { header: '余额', key: 'balance', width: 15 },
      { header: '状态', key: 'status', width: 12 }
    ]

    const data = balanceCalculations.map((calc: any) => {
      const member = trip.members.find((m: any) => m.id === calc.memberId)
      
      let status = '已结清'
      if (calc.balance > 0.01) {
        status = '应收款'
      } else if (calc.balance < -0.01) {
        status = '应付款'
      }
      
      return {
        member: member?.displayName || member?.user?.username || '虚拟成员',
        contribution: `¥${Number(calc.contribution).toFixed(2)}`,
        paid: `¥${calc.totalPaid.toFixed(2)}`,
        share: `¥${calc.totalShare.toFixed(2)}`,
        balance: `¥${Math.abs(calc.balance).toFixed(2)}`,
        status
      }
    })

    sheet.addRows(data)

    // 设置样式
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    // 根据状态设置颜色
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const statusCell = row.getCell('status')
        if (statusCell.value === '应收款') {
          statusCell.font = { color: { argb: 'FF00AA00' } }
        } else if (statusCell.value === '应付款') {
          statusCell.font = { color: { argb: 'FFAA0000' } }
        }
      }
    })
  }

  private createSettlementSheet(workbook: ExcelJS.Workbook, settlements: any[]) {
    const sheet = workbook.addWorksheet('结算方案')
    
    sheet.columns = [
      { header: '付款人', key: 'from', width: 20 },
      { header: '收款人', key: 'to', width: 20 },
      { header: '金额', key: 'amount', width: 15 },
      { header: '状态', key: 'status', width: 12 },
      { header: '备注', key: 'note', width: 30 }
    ]

    const data = settlements.map((settlement: any) => ({
      from: settlement.from?.username || '未知成员',
      to: settlement.to?.username || '未知成员', 
      amount: `¥${Number(settlement.amount).toFixed(2)}`,
      status: '待结算',
      note: `${settlement.from?.username || '未知成员'} 需支付给 ${settlement.to?.username || '未知成员'}`
    }))

    if (data.length === 0) {
      data.push({
        from: '无',
        to: '无',
        amount: '¥0.00',
        status: '已结清',
        note: '所有成员已结清，无需转账'
      })
    }

    sheet.addRows(data)

    // 设置样式
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
  }
}

export default new ExportService()