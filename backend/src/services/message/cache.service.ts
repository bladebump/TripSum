import redisClient from '../../config/redis'
import logger from '../../utils/logger'
import { MessageCategory } from '@prisma/client'

export class MessageCacheService {
  private readonly TTL = 3600 // 1小时
  private readonly MESSAGE_LIST_SIZE = 100 // 缓存最近100条消息

  /**
   * 获取未读消息计数
   */
  async getUnreadCount(userId: string, category?: MessageCategory): Promise<number | null> {
    try {
      const key = category 
        ? `unread:${userId}:${category}`
        : `unread:${userId}:total`
      
      const count = await redisClient.get(key)
      return count ? parseInt(count) : null
    } catch (error) {
      logger.error('Failed to get unread count from cache:', error)
      return null
    }
  }

  /**
   * 设置未读消息计数
   */
  async setUnreadCount(
    userId: string, 
    count: number, 
    category?: MessageCategory
  ): Promise<void> {
    try {
      const key = category 
        ? `unread:${userId}:${category}`
        : `unread:${userId}:total`
      
      await redisClient.setEx(key, this.TTL, count.toString())
      logger.debug(`Cached unread count for user ${userId}: ${count}`)
    } catch (error) {
      logger.error('Failed to set unread count in cache:', error)
    }
  }

  /**
   * 增加未读消息计数
   */
  async incrementUnreadCount(
    userId: string, 
    increment: number = 1,
    category?: MessageCategory
  ): Promise<void> {
    try {
      const key = category 
        ? `unread:${userId}:${category}`
        : `unread:${userId}:total`
      
      const newCount = await redisClient.incrBy(key, increment)
      await redisClient.expire(key, this.TTL)
      
      logger.debug(`Incremented unread count for user ${userId}: ${newCount}`)
    } catch (error) {
      logger.error('Failed to increment unread count:', error)
    }
  }

  /**
   * 减少未读消息计数
   */
  async decrementUnreadCount(
    userId: string, 
    decrement: number = 1,
    category?: MessageCategory
  ): Promise<void> {
    try {
      const key = category 
        ? `unread:${userId}:${category}`
        : `unread:${userId}:total`
      
      const newCount = await redisClient.decrBy(key, decrement)
      
      // 确保不会变成负数
      if (newCount < 0) {
        await redisClient.set(key, '0')
      }
      
      await redisClient.expire(key, this.TTL)
      logger.debug(`Decremented unread count for user ${userId}: ${Math.max(0, newCount)}`)
    } catch (error) {
      logger.error('Failed to decrement unread count:', error)
    }
  }

  /**
   * 清除未读消息计数缓存
   */
  async clearUnreadCount(userId: string): Promise<void> {
    try {
      const pattern = `unread:${userId}:*`
      const keys = await redisClient.keys(pattern)
      
      if (keys.length > 0) {
        await redisClient.del(keys)
        logger.debug(`Cleared unread count cache for user ${userId}`)
      }
    } catch (error) {
      logger.error('Failed to clear unread count:', error)
    }
  }

  /**
   * 缓存最近消息列表
   */
  async cacheRecentMessages(userId: string, messages: any[]): Promise<void> {
    try {
      const key = `messages:${userId}:recent`
      
      // 使用Redis的有序集合，按时间戳排序
      const multi = redisClient.multi()
      
      messages.forEach(msg => {
        const score = new Date(msg.createdAt).getTime()
        multi.zAdd(key, { score, value: JSON.stringify(msg) })
      })
      
      // 只保留最近的消息
      multi.zRemRangeByRank(key, 0, -(this.MESSAGE_LIST_SIZE + 1))
      multi.expire(key, this.TTL)
      
      await multi.exec()
      logger.debug(`Cached ${messages.length} recent messages for user ${userId}`)
    } catch (error) {
      logger.error('Failed to cache recent messages:', error)
    }
  }

  /**
   * 获取缓存的最近消息
   */
  async getRecentMessages(
    userId: string, 
    limit: number = 20,
    offset: number = 0
  ): Promise<any[] | null> {
    try {
      const key = `messages:${userId}:recent`
      
      // 获取指定范围的消息（按时间倒序）
      const messages = await redisClient.zRange(key, offset, offset + limit - 1, {
        REV: true,
      })
      
      if (messages.length === 0) {
        return null
      }
      
      return messages.map(msg => JSON.parse(msg))
    } catch (error) {
      logger.error('Failed to get recent messages from cache:', error)
      return null
    }
  }

  /**
   * 添加消息到缓存
   */
  async addMessageToCache(userId: string, message: any): Promise<void> {
    try {
      const key = `messages:${userId}:recent`
      const score = new Date(message.createdAt).getTime()
      
      await redisClient.zAdd(key, { score, value: JSON.stringify(message) })
      
      // 保持列表大小
      await redisClient.zRemRangeByRank(key, 0, -(this.MESSAGE_LIST_SIZE + 1))
      await redisClient.expire(key, this.TTL)
      
      logger.debug(`Added message ${message.id} to cache for user ${userId}`)
    } catch (error) {
      logger.error('Failed to add message to cache:', error)
    }
  }

  /**
   * 从缓存中删除消息
   */
  async removeMessageFromCache(userId: string, messageId: string): Promise<void> {
    try {
      const key = `messages:${userId}:recent`
      
      // 获取所有消息
      const messages = await redisClient.zRange(key, 0, -1)
      
      // 找到并删除指定消息
      for (const msg of messages) {
        const parsed = JSON.parse(msg)
        if (parsed.id === messageId) {
          await redisClient.zRem(key, msg)
          logger.debug(`Removed message ${messageId} from cache for user ${userId}`)
          break
        }
      }
    } catch (error) {
      logger.error('Failed to remove message from cache:', error)
    }
  }

  /**
   * 缓存消息统计
   */
  async cacheMessageStats(userId: string, stats: any): Promise<void> {
    try {
      const key = `stats:${userId}:messages`
      await redisClient.setEx(key, this.TTL, JSON.stringify(stats))
      logger.debug(`Cached message stats for user ${userId}`)
    } catch (error) {
      logger.error('Failed to cache message stats:', error)
    }
  }

  /**
   * 获取缓存的消息统计
   */
  async getMessageStats(userId: string): Promise<any | null> {
    try {
      const key = `stats:${userId}:messages`
      const stats = await redisClient.get(key)
      return stats ? JSON.parse(stats) : null
    } catch (error) {
      logger.error('Failed to get message stats from cache:', error)
      return null
    }
  }

  /**
   * 清除用户的所有消息缓存
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const patterns = [
        `unread:${userId}:*`,
        `messages:${userId}:*`,
        `stats:${userId}:messages`
      ]
      
      for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern)
        if (keys.length > 0) {
          await redisClient.del(keys)
        }
      }
      
      logger.debug(`Cleared all message cache for user ${userId}`)
    } catch (error) {
      logger.error('Failed to clear user cache:', error)
    }
  }

  /**
   * 预热缓存
   */
  async warmupCache(userId: string, data: {
    unreadCount?: number
    unreadByCategory?: Record<string, number>
    recentMessages?: any[]
    stats?: any
  }): Promise<void> {
    try {
      if (data.unreadCount !== undefined) {
        await this.setUnreadCount(userId, data.unreadCount)
      }
      
      if (data.unreadByCategory) {
        for (const [category, count] of Object.entries(data.unreadByCategory)) {
          await this.setUnreadCount(userId, count, category as MessageCategory)
        }
      }
      
      if (data.recentMessages) {
        await this.cacheRecentMessages(userId, data.recentMessages)
      }
      
      if (data.stats) {
        await this.cacheMessageStats(userId, data.stats)
      }
      
      logger.info(`Warmed up cache for user ${userId}`)
    } catch (error) {
      logger.error('Failed to warmup cache:', error)
    }
  }
}

export const messageCacheService = new MessageCacheService()