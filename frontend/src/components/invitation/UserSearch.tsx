import React, { useState, useEffect, useCallback } from 'react'
import { SearchBar, List, Avatar, Empty, SpinLoading } from 'antd-mobile'
import { debounce } from 'lodash-es'
import userService from '@/services/user.service'
import { UserSearchResult } from '@/types/invitation.types'
import styles from './UserSearch.module.css'

interface UserSearchProps {
  onSelect: (user: UserSearchResult) => void
  placeholder?: string
  excludeUserIds?: string[]
}

const UserSearch: React.FC<UserSearchProps> = ({
  onSelect,
  placeholder = '请输入用户名或邮箱搜索',
  excludeUserIds = []
}) => {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserSearchResult[]>([])
  const [searched, setSearched] = useState(false)

  // 搜索函数
  const searchUsers = async (searchKeyword: string) => {
    if (!searchKeyword.trim()) {
      setUsers([])
      setSearched(false)
      return
    }

    setLoading(true)
    try {
      const results = await userService.searchUsers({
        keyword: searchKeyword.trim(),
        limit: 20
      })
      
      // 过滤掉需要排除的用户
      const filteredResults = results.filter(
        user => !excludeUserIds.includes(user.id)
      )
      
      setUsers(filteredResults)
      setSearched(true)
    } catch (error) {
      console.error('搜索用户失败:', error)
      setUsers([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce((searchKeyword: string) => {
      searchUsers(searchKeyword)
    }, 300),
    [excludeUserIds]
  )

  // 监听关键词变化
  useEffect(() => {
    debouncedSearch(keyword)
  }, [keyword, debouncedSearch])

  // 处理用户选择
  const handleUserSelect = (user: UserSearchResult) => {
    onSelect(user)
    setKeyword('')
    setUsers([])
    setSearched(false)
  }

  // 获取用户显示名称
  const getUserDisplayName = (user: UserSearchResult) => {
    return user.username || user.email.split('@')[0]
  }

  // 获取用户头像显示内容
  const getAvatarContent = (user: UserSearchResult) => {
    const displayName = getUserDisplayName(user)
    return displayName.charAt(0).toUpperCase()
  }

  return (
    <div className={styles.userSearch}>
      <SearchBar
        placeholder={placeholder}
        value={keyword}
        onChange={setKeyword}
        onClear={() => {
          setKeyword('')
          setUsers([])
          setSearched(false)
        }}
      />

      {loading && (
        <div className={styles.loading}>
          <SpinLoading />
          <span>搜索中...</span>
        </div>
      )}

      {!loading && searched && users.length === 0 && (
        <Empty
          description={keyword ? '未找到匹配的用户' : '请输入关键词搜索'}
          imageStyle={{ width: 80 }}
        />
      )}

      {!loading && users.length > 0 && (
        <List className={styles.userList}>
          {users.map(user => (
            <List.Item
              key={user.id}
              onClick={() => handleUserSelect(user)}
              prefix={
                <Avatar 
                  src={user.avatarUrl || ''} 
                  style={{ '--size': '40px' }}
                  fallback={<div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#1890ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {getAvatarContent(user)}
                  </div>}
                />
              }
              description={user.email}
            >
              {getUserDisplayName(user)}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}

export default UserSearch