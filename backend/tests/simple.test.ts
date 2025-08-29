describe('简单测试', () => {
  it('应该能正常运行', () => {
    expect(1 + 1).toBe(2)
  })

  it('字符串测试', () => {
    expect('hello').toContain('ell')
  })

  it('数组测试', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)
  })
})