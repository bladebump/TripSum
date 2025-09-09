import { TripSummaryResult } from './types'

export class ReportGenerator {
  generateHTMLReport(trip: any, summary: TripSummaryResult): string {
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('zh-CN')
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${trip.name} - 行程总结报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1890ff;
      border-bottom: 2px solid #1890ff;
      padding-bottom: 10px;
    }
    h2 {
      color: #333;
      margin-top: 30px;
      border-left: 4px solid #1890ff;
      padding-left: 10px;
    }
    .summary {
      background: #f0f5ff;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .insights {
      margin: 20px 0;
    }
    .insight {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      padding: 15px;
      margin: 10px 0;
    }
    .insight-title {
      font-weight: bold;
      color: #1890ff;
      margin-bottom: 5px;
    }
    .highlights {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .highlight {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .highlight-emoji {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .recommendations, .warnings, .advice {
      margin: 20px 0;
    }
    .recommendations li, .warnings li, .advice li {
      margin: 10px 0;
      padding: 10px;
      background: #f9f9f9;
      border-left: 3px solid #52c41a;
      list-style: none;
    }
    .warnings li {
      border-left-color: #faad14;
      background: #fffbe6;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e8e8e8;
      color: #999;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 ${trip.name} - 行程总结报告</h1>
    
    <div class="summary">
      <h2>📊 总体概况</h2>
      <p>${summary.summary}</p>
      <p><small>生成时间：${formatDate(summary.generatedAt)}</small></p>
    </div>

    <h2>✨ 行程亮点</h2>
    <div class="highlights">
      ${summary.highlights.map(h => `
        <div class="highlight">
          <div class="highlight-emoji">${h.emoji || '🌟'}</div>
          <div><strong>${h.title}</strong></div>
          <div>${h.description}</div>
        </div>
      `).join('')}
    </div>

    <h2>🔍 消费洞察</h2>
    <div class="insights">
      ${summary.insights.map(i => `
        <div class="insight">
          <div class="insight-title">${i.title}</div>
          <div>${i.description}</div>
        </div>
      `).join('')}
    </div>

    ${summary.warnings.length > 0 ? `
      <h2>⚠️ 注意事项</h2>
      <ul class="warnings">
        ${summary.warnings.map(w => `<li>${w}</li>`).join('')}
      </ul>
    ` : ''}

    <h2>💡 优化建议</h2>
    <ul class="recommendations">
      ${summary.recommendations.map(r => `<li>${r}</li>`).join('')}
    </ul>

    <h2>🚀 下次旅行建议</h2>
    <ul class="advice">
      ${summary.nextTripAdvice.map(a => `<li>${a}</li>`).join('')}
    </ul>

    <div class="footer">
      <p>本报告由 TripSum 旅算 AI 自动生成</p>
      <p>让每一次旅行都更加精彩！</p>
    </div>
  </div>
</body>
</html>
    `
  }
}

export const reportGenerator = new ReportGenerator()