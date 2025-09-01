// 测试AI解析功能的示例输入
const testCases = [
  {
    description: "昨天吃饭花了300",
    expected: {
      intent: "expense",
      hasAmount: true,
      hasDate: true
    }
  },
  {
    description: "预定了10.1晚上的酒店2000",
    expected: {
      intent: "expense",
      hasAmount: true,
      hasDate: true,
      consumptionDate: "2025-10-01"
    }
  },
  {
    description: "机票每人5000",
    expected: {
      intent: "expense",
      hasPerPersonAmount: true,
      totalCalculated: true
    }
  },
  {
    description: "我和张三打车100",
    expected: {
      intent: "expense",
      hasAmount: true,
      hasSpecificParticipants: true
    }
  },
  {
    description: "除了李四都去吃饭200",
    expected: {
      intent: "expense",
      hasAmount: true,
      hasExcludedMembers: true
    }
  },
  {
    description: "每人预存1000",
    expected: {
      intent: "contribution",
      hasPerPersonAmount: true
    }
  },
  {
    description: "预存200，我多交5000",
    expected: {
      intent: "contribution",
      hasCustomAmounts: true
    }
  },
  {
    description: "提前订了春节的机票3000",
    expected: {
      intent: "expense",
      hasAmount: true,
      hasDate: true,
      description: "机票-春节"
    }
  },
  {
    description: "下周五的餐厅订金500",
    expected: {
      intent: "expense",
      hasAmount: true,
      hasDate: true
    }
  }
];

console.log('AI解析测试用例:');
console.log('================');
testCases.forEach((testCase, index) => {
  console.log(`\n测试 ${index + 1}: "${testCase.description}"`);
  console.log('预期结果:');
  console.log('- 意图类型:', testCase.expected.intent);
  if (testCase.expected.hasAmount) console.log('- 应解析出金额');
  if (testCase.expected.hasPerPersonAmount) console.log('- 应解析出每人金额');
  if (testCase.expected.hasDate) console.log('- 应解析出日期');
  if (testCase.expected.consumptionDate) console.log('- 消费日期:', testCase.expected.consumptionDate);
  if (testCase.expected.hasSpecificParticipants) console.log('- 应识别特定参与者');
  if (testCase.expected.hasExcludedMembers) console.log('- 应识别排除成员');
  if (testCase.expected.hasCustomAmounts) console.log('- 应处理个性化金额');
  if (testCase.expected.totalCalculated) console.log('- 应计算总额（每人金额 × 人数）');
});

console.log('\n\n优化要点:');
console.log('===========');
console.log('1. ✅ 移除了calculator工具调用，直接在JavaScript中计算');
console.log('2. ✅ 添加了具体示例到提示词中');
console.log('3. ✅ 支持日期解析（包括预定场景）');
console.log('4. ✅ 区分记账时间(expenseDate)和消费时间(consumptionDate)');
console.log('5. ✅ 简化了AI调用流程，只需一次API请求');
console.log('6. ✅ 提高了性能和可维护性');