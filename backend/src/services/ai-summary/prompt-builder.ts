export class PromptBuilder {
  buildAnalysisPrompt(data: any): string {
    return `
你是一位专业的旅行消费分析师。请根据以下行程数据生成深度分析报告。

行程信息：
- 名称：${data.tripName}
- 描述：${data.description || '无'}
- 时长：${data.duration}天
- 参与人数：${data.memberCount}人
- 总支出：${data.totalExpenses}元
- 支出笔数：${data.expenseCount}笔
- 人均消费：${data.averagePerPerson.toFixed(2)}元
- 日均消费：${data.averagePerDay.toFixed(2)}元
- 消费趋势：${data.trend === 'increasing' ? '上升' : data.trend === 'decreasing' ? '下降' : '平稳'}

分类支出TOP3：
${data.categoryBreakdown?.slice(0, 3).map((c: any) => 
  `- ${c.categoryName}：${c.amount}元 (${c.percentage.toFixed(1)}%)`
).join('\n') || '无分类数据'}

支付方式分布：
- 基金池支付：${data.paymentMethodDistribution.fundPool.toFixed(1)}%
- 成员垫付：${data.paymentMethodDistribution.memberPaid.toFixed(1)}%

时间分布特征：
- 早上消费：${data.timeDistribution?.morning.percentage.toFixed(1)}%
- 下午消费：${data.timeDistribution?.afternoon.percentage.toFixed(1)}%
- 晚上消费：${data.timeDistribution?.evening.percentage.toFixed(1)}%
- 深夜消费：${data.timeDistribution?.night.percentage.toFixed(1)}%

最大单笔支出TOP3：
${data.topExpenses?.slice(0, 3).map((e: any) => 
  `- ${e.description}：${e.amount}元 (${e.category || '未分类'})`
).join('\n') || '无支出数据'}

${data.anomalies?.length > 0 ? `
异常消费提醒：
${data.anomalies.slice(0, 3).map((a: any) => `- ${a.message}`).join('\n')}
` : ''}

请生成：
1. 一段200字左右的行程消费总结，包括消费特点、模式识别、团队协作情况等
2. 3-5条具体的优化建议，帮助下次旅行更好地控制预算和提升体验

返回JSON格式：
{
  "summary": "总结内容",
  "recommendations": ["建议1", "建议2", "建议3"]
}
`
  }

  getSystemPrompt(): string {
    return '你是一位专业的旅行消费分析师，擅长从数据中发现规律，提供有价值的洞察和建议。请用友好、专业的语气撰写分析报告。'
  }
}

export const promptBuilder = new PromptBuilder()