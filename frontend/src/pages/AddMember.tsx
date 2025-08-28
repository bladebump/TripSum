import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  NavBar,
  Tabs,
  Input,
  Button,
  List,
  Tag,
  Toast,
  Space,
  Divider
} from 'antd-mobile'
import { AddOutline, DeleteOutline } from 'antd-mobile-icons'
import { useTripStore } from '@/stores/trip.store'
import { useAuthStore } from '@/stores/auth.store'
import aiService from '@/services/ai.service'
import Loading from '@/components/common/Loading'
import './AddMember.scss'

interface ParsedMember {
  displayName: string
  confidence: number
  selected: boolean
}

const AddMember: React.FC = () => {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentTrip, members, fetchMembers } = useTripStore()
  const { user } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState('manual')
  const [textInput, setTextInput] = useState('')
  const [manualMembers, setManualMembers] = useState<string[]>([''])
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([])
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)

  useEffect(() => {
    if (tripId && !currentTrip) {
      fetchMembers(tripId)
    }
  }, [tripId, currentTrip, fetchMembers])

  const isAdmin = members.find(m => m.userId === user?.id)?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="add-member-page">
        <NavBar onBack={() => navigate(`/trips/${tripId}`)}>
          添加成员
        </NavBar>
        <div className="no-permission">
          <p>只有管理员可以添加成员</p>
        </div>
      </div>
    )
  }

  const addManualMember = () => {
    setManualMembers([...manualMembers, ''])
  }

  const removeManualMember = (index: number) => {
    if (manualMembers.length > 1) {
      setManualMembers(manualMembers.filter((_, i) => i !== index))
    }
  }

  const updateManualMember = (index: number, value: string) => {
    const updated = [...manualMembers]
    updated[index] = value
    setManualMembers(updated)
  }

  const handleManualAdd = async () => {
    const validMembers = manualMembers.filter(name => name.trim().length > 0)
    
    if (validMembers.length === 0) {
      Toast.show('请至少输入一个成员姓名')
      return
    }

    await addMembers(validMembers)
  }

  const handleTextParse = async () => {
    if (!textInput.trim()) {
      Toast.show('请输入文本内容')
      return
    }

    setParsing(true)
    try {
      const result = await aiService.parseUserInput(tripId!, textInput.trim())
      
      if (result.confidence < 0.3 || result.intent.intent !== 'member') {
        Toast.show('无法识别有效的成员信息，请尝试更明确的描述')
        return
      }

      const membersWithSelection = result.data.members.map((member: any) => ({
        ...member,
        selected: true
      }))
      
      setParsedMembers(membersWithSelection)
      
      if (membersWithSelection.length === 0) {
        Toast.show('没有识别到具体的成员姓名')
      } else {
        Toast.show(`识别到 ${membersWithSelection.length} 个成员`)
      }
    } catch (error) {
      Toast.show('解析失败，请重试')
    } finally {
      setParsing(false)
    }
  }

  const toggleMemberSelection = (index: number) => {
    const updated = [...parsedMembers]
    updated[index].selected = !updated[index].selected
    setParsedMembers(updated)
  }

  const handleConfirmParsed = async () => {
    const selectedMembers = parsedMembers
      .filter(m => m.selected)
      .map(m => m.displayName)
    
    if (selectedMembers.length === 0) {
      Toast.show('请至少选择一个成员')
      return
    }

    await addMembers(selectedMembers)
  }

  const addMembers = async (memberNames: string[]) => {
    setLoading(true)
    try {
      const result = await aiService.addMembers(tripId!, memberNames)
      
      if (result.success) {
        let message = `成功添加 ${result.added.length} 个成员`
        
        if (result.failed.length > 0) {
          message += `，${result.failed.length} 个失败`
        }
        
        if (result.validation.duplicates.length > 0) {
          message += `，${result.validation.duplicates.length} 个重复`
        }
        
        Toast.show(message)
        
        // 刷新成员列表
        await fetchMembers(tripId!)
        
        // 清空输入
        setManualMembers([''])
        setTextInput('')
        setParsedMembers([])
        
        // 如果全部成功，返回上一页
        if (result.failed.length === 0 && result.validation.duplicates.length === 0) {
          setTimeout(() => {
            navigate(`/trips/${tripId}`)
          }, 1000)
        }
      } else {
        Toast.show('添加失败')
      }
    } catch (error) {
      Toast.show('添加成员失败')
    } finally {
      setLoading(false)
    }
  }

  if (!currentTrip) {
    return <Loading text="加载中..." />
  }

  return (
    <div className="add-member-page">
      <NavBar onBack={() => navigate(`/trips/${tripId}`)}>
        添加成员
      </NavBar>

      <div className="current-members">
        <div className="section-title">当前成员 ({members.length})</div>
        <div className="member-tags">
          {members.map(member => (
            <Tag key={member.id} color="primary">
              {member.isVirtual ? member.displayName : member.user?.username}
              {member.role === 'admin' && ' (管理员)'}
            </Tag>
          ))}
        </div>
      </div>

      <Divider />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.Tab title="手动添加" key="manual">
          <div className="tab-content">
            <div className="section-title">成员姓名</div>
            
            {manualMembers.map((member, index) => (
              <div key={index} className="member-input-row">
                <Input
                  placeholder={`成员 ${index + 1} 的姓名`}
                  value={member}
                  onChange={(value) => updateManualMember(index, value)}
                />
                {manualMembers.length > 1 && (
                  <Button
                    color="danger"
                    size="small"
                    onClick={() => removeManualMember(index)}
                  >
                    <DeleteOutline />
                  </Button>
                )}
              </div>
            ))}

            <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
              <Button 
                color="primary" 
                fill="outline" 
                onClick={addManualMember}
                block
              >
                <AddOutline /> 添加更多成员
              </Button>
              
              <Button
                color="primary"
                onClick={handleManualAdd}
                loading={loading}
                block
              >
                确认添加成员
              </Button>
            </Space>
          </div>
        </Tabs.Tab>

        <Tabs.Tab title="文本解析" key="text">
          <div className="tab-content">
            <div className="section-title">智能文本解析</div>
            <p className="section-desc">
              输入包含成员信息的文本，AI会自动识别姓名
            </p>

            <Input
              placeholder="例如：添加张三、李四、王五 或 和小明小红一起"
              value={textInput}
              onChange={setTextInput}
            />

            <Button
              color="primary"
              onClick={handleTextParse}
              loading={parsing}
              disabled={!textInput.trim()}
              block
              style={{ marginTop: 16 }}
            >
              解析成员信息
            </Button>

            {parsedMembers.length > 0 && (
              <>
                <div className="section-title" style={{ marginTop: 24 }}>
                  识别结果 (点击可选择/取消)
                </div>
                
                <List>
                  {parsedMembers.map((member, index) => (
                    <List.Item
                      key={index}
                      onClick={() => toggleMemberSelection(index)}
                      prefix={
                        <input
                          type="checkbox"
                          checked={member.selected}
                          onChange={() => toggleMemberSelection(index)}
                        />
                      }
                      extra={
                        <Tag color={member.confidence > 0.7 ? 'success' : 'warning'}>
                          {Math.round(member.confidence * 100)}%
                        </Tag>
                      }
                    >
                      {member.displayName}
                    </List.Item>
                  ))}
                </List>

                <Button
                  color="primary"
                  onClick={handleConfirmParsed}
                  loading={loading}
                  block
                  style={{ marginTop: 16 }}
                >
                  确认添加选中成员
                </Button>
              </>
            )}
          </div>
        </Tabs.Tab>
      </Tabs>
    </div>
  )
}

export default AddMember