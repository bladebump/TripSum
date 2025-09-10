import { io, Socket } from 'socket.io-client'
import { MessageWithSender, InvitationResponse } from '@/types'

interface SocketEvents {
  'new_message': (message: MessageWithSender) => void
  'message_read': (messageId: string) => void
  'invitation_received': (invitation: InvitationResponse) => void
  'invitation_accepted': (data: { invitationId: string; memberId: string }) => void
  'invitation_rejected': (invitationId: string) => void
  'trip_member_joined': (data: { tripId: string; member: any }) => void
  'expense_created': (data: { tripId: string; expense: any }) => void
  'expense_updated': (data: { tripId: string; expense: any }) => void
}

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private userId: string | null = null

  /**
   * 初始化Socket连接
   */
  connect(userId: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }

    this.userId = userId
    const token = localStorage.getItem('token')
    
    if (!token) {
      console.error('No token found, cannot connect to socket')
      return
    }

    // 修复Socket连接URL逻辑
    let socketUrl = ''
    const apiUrl = import.meta.env.VITE_API_URL
    
    if (apiUrl?.startsWith('http')) {
      // 完整URL模式: http://localhost:3000/api -> http://localhost:3000
      socketUrl = apiUrl.replace('/api', '')
    } else if (apiUrl?.startsWith('/api')) {
      // 相对路径模式: /api -> http://localhost:3000 (开发环境)
      socketUrl = 'http://localhost:3000'
    } else {
      // 备用默认值
      socketUrl = 'http://localhost:3000'
    }
    
    console.log('Socket connecting to:', socketUrl)
    
    this.socket = io(socketUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000, // 20秒连接超时
      forceNew: true,
    })

    this.setupEventHandlers()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    // 连接成功
    this.socket.on('connect', () => {
      console.log('Socket connected successfully')
      this.reconnectAttempts = 0
      
      // 发送认证事件，加入用户房间
      if (this.userId) {
        this.socket?.emit('auth', this.userId)
      }
    })

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
        this.disconnect()
      }
    })

    // 重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts')
      this.reconnectAttempts = 0
      
      if (this.userId) {
        this.socket?.emit('auth', this.userId)
      }
    })

    // 消息事件
    this.socket.on('new_message', (message: MessageWithSender) => {
      this.emit('new_message', message)
    })

    this.socket.on('message_read', (messageId: string) => {
      this.emit('message_read', messageId)
    })

    // 邀请事件
    this.socket.on('invitation_received', (invitation: InvitationResponse) => {
      this.emit('invitation_received', invitation)
    })

    this.socket.on('invitation_accepted', (data: any) => {
      this.emit('invitation_accepted', data)
    })

    this.socket.on('invitation_rejected', (invitationId: string) => {
      this.emit('invitation_rejected', invitationId)
    })

    // 行程事件
    this.socket.on('trip_member_joined', (data: any) => {
      this.emit('trip_member_joined', data)
    })

    // 费用事件
    this.socket.on('expense_created', (data: any) => {
      this.emit('expense_created', data)
    })

    this.socket.on('expense_updated', (data: any) => {
      this.emit('expense_updated', data)
    })
  }

  /**
   * 监听事件
   */
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback as Function)
  }

  /**
   * 取消监听事件
   */
  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    this.listeners.get(event)?.delete(callback as Function)
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  /**
   * 发送消息
   */
  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot send message')
    }
  }

  /**
   * 加入房间
   */
  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_room', room)
    }
  }

  /**
   * 离开房间
   */
  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', room)
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
      this.userId = null
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * 重新连接
   */
  reconnect(): void {
    if (!this.socket?.connected && this.userId) {
      this.connect(this.userId)
    }
  }
}

export default new SocketService()