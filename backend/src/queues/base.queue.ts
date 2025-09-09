import Bull, { Queue, Job, JobOptions } from 'bull'
import logger from '../utils/logger'

export interface QueueConfig {
  name: string
  redisUrl?: string
  defaultJobOptions?: JobOptions
}

export abstract class BaseQueue<T = any> {
  protected queue: Queue<T>
  protected name: string

  constructor(config: QueueConfig) {
    this.name = config.name
    const redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    
    this.queue = new Bull(config.name, redisUrl, {
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...config.defaultJobOptions,
      },
    })

    this.setupEventHandlers()
    this.setupProcessor()
  }

  /**
   * 设置队列事件处理器
   */
  private setupEventHandlers() {
    this.queue.on('completed', (job: Job<T>) => {
      logger.info(`[${this.name}] Job ${job.id} completed`)
    })

    this.queue.on('failed', (job: Job<T>, err: Error) => {
      logger.error(`[${this.name}] Job ${job.id} failed:`, err)
      this.handleFailedJob(job, err)
    })

    this.queue.on('stalled', (job: Job<T>) => {
      logger.warn(`[${this.name}] Job ${job.id} stalled`)
    })

    this.queue.on('error', (error: Error) => {
      logger.error(`[${this.name}] Queue error:`, error)
    })
  }

  /**
   * 设置队列处理器
   */
  private setupProcessor() {
    this.queue.process(async (job: Job<T>) => {
      logger.info(`[${this.name}] Processing job ${job.id}`)
      try {
        const result = await this.process(job)
        logger.info(`[${this.name}] Job ${job.id} processed successfully`)
        return result
      } catch (error) {
        logger.error(`[${this.name}] Job ${job.id} processing error:`, error)
        throw error
      }
    })
  }

  /**
   * 处理失败的任务
   */
  protected async handleFailedJob(job: Job<T>, error: Error) {
    // 检查是否达到最大重试次数
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      // 将任务移至死信队列
      await this.moveToDeadLetterQueue(job, error)
    }
  }

  /**
   * 移至死信队列
   */
  protected async moveToDeadLetterQueue(job: Job<T>, error: Error) {
    const dlqName = `${this.name}:dlq`
    const dlq = new Bull(dlqName, process.env.REDIS_URL || 'redis://localhost:6379')
    
    await dlq.add('failed-job', {
      originalJobId: job.id,
      data: job.data,
      error: error.message,
      failedAt: new Date(),
      attempts: job.attemptsMade,
    })

    logger.error(`[${this.name}] Job ${job.id} moved to dead letter queue`)
  }

  /**
   * 添加任务到队列
   */
  async add(data: T, options?: JobOptions): Promise<Job<T>> {
    return this.queue.add(data, options)
  }

  /**
   * 批量添加任务
   */
  async addBulk(jobs: Array<{ data: T; opts?: JobOptions }>): Promise<Job<T>[]> {
    return this.queue.addBulk(jobs)
  }

  /**
   * 获取队列状态
   */
  async getStatus() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ])

    return {
      name: this.name,
      counts: {
        waiting,
        active,
        completed,
        failed,
        delayed,
      },
    }
  }

  /**
   * 清理队列
   */
  async clean(grace: number = 0, status?: 'completed' | 'wait' | 'active' | 'delayed' | 'failed') {
    return this.queue.clean(grace, status)
  }

  /**
   * 暂停队列
   */
  async pause() {
    return this.queue.pause()
  }

  /**
   * 恢复队列
   */
  async resume() {
    return this.queue.resume()
  }

  /**
   * 关闭队列
   */
  async close() {
    return this.queue.close()
  }

  /**
   * 抽象方法：处理任务
   * 子类必须实现此方法
   */
  protected abstract process(job: Job<T>): Promise<any>
}