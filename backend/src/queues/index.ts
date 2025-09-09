import { messageQueue } from './message.queue'
import logger from '../utils/logger'

export class QueueManager {
  private queues: Map<string, any> = new Map()

  constructor() {
    // 注册所有队列
    this.registerQueue('message', messageQueue)
  }

  /**
   * 注册队列
   */
  private registerQueue(name: string, queue: any) {
    this.queues.set(name, queue)
    logger.info(`Queue registered: ${name}`)
  }

  /**
   * 获取队列
   */
  getQueue(name: string) {
    return this.queues.get(name)
  }

  /**
   * 启动所有队列
   */
  async startAll() {
    logger.info('Starting all queues...')
    for (const [name, queue] of this.queues) {
      await queue.resume()
      logger.info(`Queue started: ${name}`)
    }
  }

  /**
   * 停止所有队列
   */
  async stopAll() {
    logger.info('Stopping all queues...')
    for (const [name, queue] of this.queues) {
      await queue.pause()
      logger.info(`Queue paused: ${name}`)
    }
  }

  /**
   * 关闭所有队列
   */
  async closeAll() {
    logger.info('Closing all queues...')
    for (const [name, queue] of this.queues) {
      await queue.close()
      logger.info(`Queue closed: ${name}`)
    }
  }

  /**
   * 获取所有队列状态
   */
  async getAllStatus() {
    const statuses = []
    for (const [_name, queue] of this.queues) {
      const status = await queue.getStatus()
      statuses.push(status)
    }
    return statuses
  }

  /**
   * 清理所有队列
   */
  async cleanAll(grace: number = 0) {
    for (const [_name, queue] of this.queues) {
      await queue.clean(grace)
      logger.info(`Queue cleaned`)
    }
  }
}

// 创建单例实例
export const queueManager = new QueueManager()

// 导出队列实例
export { messageQueue } from './message.queue'