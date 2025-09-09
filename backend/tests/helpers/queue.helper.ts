import Bull, { Queue } from 'bull'

const testQueues: Map<string, Queue> = new Map()

/**
 * 获取测试队列
 */
export function getTestQueue<T = any>(name: string): Queue<T> {
  if (!testQueues.has(name)) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const queue = new Bull<T>(name, redisUrl, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    })
    
    // 禁用队列处理器在测试中自动运行
    queue.pause()
    
    testQueues.set(name, queue)
  }
  
  return testQueues.get(name) as Queue<T>
}

/**
 * 清理测试队列
 */
export async function cleanupTestQueues() {
  for (const [name, queue] of testQueues) {
    try {
      // 清理所有任务
      await queue.empty()
      await queue.clean(0, 'completed')
      await queue.clean(0, 'failed')
      await queue.clean(0, 'delayed')
      await queue.clean(0, 'wait')
      await queue.clean(0, 'active')
    } catch (error) {
      console.warn(`Failed to cleanup queue ${name}:`, error)
    }
  }
}

/**
 * 关闭所有测试队列
 */
export async function closeTestQueues() {
  for (const [name, queue] of testQueues) {
    try {
      await queue.close()
    } catch (error) {
      console.warn(`Failed to close queue ${name}:`, error)
    }
  }
  testQueues.clear()
}

/**
 * 创建一个mock的队列（当Redis不可用时）
 */
export function createMockQueue<T = any>(name: string): any {
  const jobs: any[] = []
  let jobIdCounter = 1
  
  return {
    name,
    add: jest.fn(async (data: T, options?: any) => {
      const job = {
        id: jobIdCounter++,
        data,
        opts: options || {},
        attemptsMade: 0,
      }
      jobs.push(job)
      return job
    }),
    addBulk: jest.fn(async (bulkJobs: any[]) => {
      return bulkJobs.map(({ data, opts }) => {
        const job = {
          id: jobIdCounter++,
          data,
          opts: opts || {},
          attemptsMade: 0,
        }
        jobs.push(job)
        return job
      })
    }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    empty: jest.fn(),
    clean: jest.fn(),
    getJobs: jest.fn(async () => jobs),
    getJobCounts: jest.fn(async () => ({
      waiting: jobs.filter(j => !j.processed).length,
      active: 0,
      completed: jobs.filter(j => j.processed).length,
      failed: 0,
      delayed: 0,
    })),
    getWaitingCount: jest.fn(async () => jobs.filter(j => !j.processed).length),
    getActiveCount: jest.fn(async () => 0),
    getCompletedCount: jest.fn(async () => jobs.filter(j => j.processed).length),
    getFailedCount: jest.fn(async () => 0),
    getDelayedCount: jest.fn(async () => 0),
  }
}

/**
 * 等待队列处理完成
 */
export async function waitForQueueCompletion(queue: Queue, timeout = 5000): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const counts = await queue.getJobCounts()
    
    if (counts.waiting === 0 && counts.active === 0 && counts.delayed === 0) {
      return
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  throw new Error(`Queue ${queue.name} did not complete within ${timeout}ms`)
}