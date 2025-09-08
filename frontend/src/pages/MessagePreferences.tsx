import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  NavBar, 
  List, 
  Switch, 
  Checkbox,
  Radio,
  Toast,
  Button,
  Card
} from 'antd-mobile'
import messageService from '@/services/message.service'
import { 
  MessageType, 
  NotificationFrequency,
  MessagePreference 
} from '@/types/message.types'
import Loading from '@/components/common/Loading'
import styles from './MessagePreferences.module.css'

interface PreferenceItem {
  type: MessageType
  label: string
  description: string
}

const MessagePreferences: React.FC = () => {
  const navigate = useNavigate()
  const [preferences, setPreferences] = useState<MessagePreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 消息类型配置
  const messageTypes: PreferenceItem[] = [
    {
      type: MessageType.SYSTEM,
      label: '系统消息',
      description: '系统公告、维护通知等'
    },
    {
      type: MessageType.INVITATION,
      label: '邀请通知',
      description: '行程邀请、成员加入等'
    },
    {
      type: MessageType.EXPENSE,
      label: '费用通知',
      description: '新增支出、费用变更等'
    },
    {
      type: MessageType.SETTLEMENT,
      label: '结算通知',
      description: '结算提醒、收款确认等'
    },
    {
      type: MessageType.REMINDER,
      label: '提醒消息',
      description: '定期账单、活动提醒等'
    }
  ]

  // 初始化加载
  useEffect(() => {
    loadPreferences()
  }, [])

  // 加载偏好设置
  const loadPreferences = async () => {
    setLoading(true)
    try {
      const data = await messageService.getMessagePreferences()
      
      // 如果没有设置，为每个消息类型创建默认偏好
      if (!data || data.length === 0) {
        const defaultPreferences: MessagePreference[] = messageTypes.map(item => ({
          id: '',
          userId: '',
          messageType: item.type,
          channels: ['inApp'],
          enabled: true,
          frequency: NotificationFrequency.REAL_TIME
        }))
        setPreferences(defaultPreferences)
      } else {
        // 确保所有消息类型都有偏好设置
        const prefsMap = new Map(data.map(p => [p.messageType, p]))
        const allPreferences = messageTypes.map(item => {
          return prefsMap.get(item.type) || {
            id: '',
            userId: '',
            messageType: item.type,
            channels: ['inApp'],
            enabled: true,
            frequency: NotificationFrequency.REAL_TIME
          }
        })
        setPreferences(allPreferences)
      }
    } catch (error) {
      console.error('加载偏好设置失败:', error)
      Toast.show({
        content: '加载设置失败',
        icon: 'fail'
      })
    } finally {
      setLoading(false)
    }
  }

  // 更新偏好设置
  const updatePreference = (
    messageType: MessageType, 
    field: keyof MessagePreference, 
    value: any
  ) => {
    setPreferences(prev => prev.map(pref => {
      if (pref.messageType === messageType) {
        return { ...pref, [field]: value }
      }
      return pref
    }))
  }

  // 切换启用状态
  const toggleEnabled = (messageType: MessageType, enabled: boolean) => {
    updatePreference(messageType, 'enabled', enabled)
  }

  // 切换渠道
  const toggleChannel = (messageType: MessageType, channel: string, checked: boolean) => {
    const pref = preferences.find(p => p.messageType === messageType)
    if (!pref) return

    const newChannels = checked 
      ? [...pref.channels, channel]
      : pref.channels.filter(c => c !== channel)
    
    // 至少保留一个渠道
    if (newChannels.length === 0) {
      Toast.show({
        content: '至少需要选择一个接收渠道',
        icon: 'fail'
      })
      return
    }

    updatePreference(messageType, 'channels', newChannels)
  }

  // 更新频率
  const updateFrequency = (messageType: MessageType, frequency: NotificationFrequency) => {
    updatePreference(messageType, 'frequency', frequency)
  }

  // 保存设置
  const handleSave = async () => {
    setSaving(true)
    try {
      await messageService.updateMessagePreferences(preferences)
      Toast.show({
        content: '设置已保存',
        icon: 'success'
      })
      navigate(-1)
    } catch (error) {
      console.error('保存设置失败:', error)
      Toast.show({
        content: '保存失败，请重试',
        icon: 'fail'
      })
    } finally {
      setSaving(false)
    }
  }

  // 获取偏好设置
  const getPreference = (messageType: MessageType) => {
    return preferences.find(p => p.messageType === messageType)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <NavBar onBack={() => navigate(-1)}>消息偏好设置</NavBar>
        <Loading />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <NavBar onBack={() => navigate(-1)}>消息偏好设置</NavBar>
      
      <div className={styles.content}>
        {messageTypes.map(item => {
          const pref = getPreference(item.type)
          if (!pref) return null

          return (
            <Card key={item.type} className={styles.preferenceCard}>
              {/* 消息类型标题 */}
              <div className={styles.header}>
                <div className={styles.typeInfo}>
                  <h3 className={styles.typeLabel}>{item.label}</h3>
                  <p className={styles.typeDesc}>{item.description}</p>
                </div>
                <Switch
                  checked={pref.enabled}
                  onChange={(checked) => toggleEnabled(item.type, checked)}
                />
              </div>

              {/* 只有启用时才显示详细设置 */}
              {pref.enabled && (
                <>
                  {/* 接收渠道 */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>接收渠道</div>
                    <div className={styles.channels}>
                      <Checkbox
                        checked={pref.channels.includes('inApp')}
                        onChange={(checked) => toggleChannel(item.type, 'inApp', checked)}
                      >
                        站内消息
                      </Checkbox>
                      <Checkbox
                        checked={pref.channels.includes('email')}
                        onChange={(checked) => toggleChannel(item.type, 'email', checked)}
                      >
                        邮件通知
                      </Checkbox>
                    </div>
                  </div>

                  {/* 接收频率 */}
                  <div className={styles.section}>
                    <div className={styles.sectionTitle}>接收频率</div>
                    <Radio.Group
                      value={pref.frequency}
                      onChange={(val) => updateFrequency(item.type, val as NotificationFrequency)}
                    >
                      <div className={styles.frequencies}>
                        <Radio value={NotificationFrequency.REAL_TIME}>
                          实时接收
                        </Radio>
                        <Radio value={NotificationFrequency.DAILY}>
                          每日汇总
                        </Radio>
                        <Radio value={NotificationFrequency.WEEKLY}>
                          每周汇总
                        </Radio>
                      </div>
                    </Radio.Group>
                  </div>
                </>
              )}
            </Card>
          )
        })}

        {/* 保存按钮 */}
        <div className={styles.actions}>
          <Button
            block
            color='primary'
            size='large'
            loading={saving}
            onClick={handleSave}
          >
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}

export default MessagePreferences