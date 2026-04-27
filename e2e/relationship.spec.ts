import { test, expect } from '@playwright/test'

// 每个测试套件前清理数据库
test.beforeAll(async ({ request }) => {
  const res = await request.get('/api/v1/persons')
  const persons = await res.json()
  if (persons?.data) {
    for (const p of persons.data) {
      await request.delete(`/api/v1/persons/${p.id}`)
    }
  }
})

test.describe('个人关系库 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.g6-container, .empty-state, .top-bar', { timeout: 10000 })
    await page.waitForTimeout(500)
  })

  test('首页显示空状态引导', async ({ page }) => {
    const emptyText = page.locator('.empty-content h2')
    await expect(emptyText).toContainText('欢迎使用个人关系库')
  })

  test('添加联系人并显示详情', async ({ page }) => {
    await page.click('.top-bar button:has-text("添加联系人")')
    await page.waitForSelector('.el-dialog', { timeout: 5000 })

    await page.fill('.el-dialog [placeholder="请输入姓名"]', '张三')
    await page.fill('.el-dialog [placeholder="电话号码"]', '13800138000')
    await page.fill('.el-dialog [placeholder="邮箱地址"]', 'zhangsan@test.com')

    await page.click('.el-dialog__footer button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 验证详情面板打开并显示姓名
    const detailName = page.locator('.person-detail .name')
    await expect(detailName).toContainText('张三')

    // 验证 data 字段中的电话和邮箱
    const phoneField = page.locator('.person-detail .field-item label').filter({ hasText: 'phone' })
    await expect(phoneField).toBeVisible()
    const emailField = page.locator('.person-detail .field-item label').filter({ hasText: 'email' })
    await expect(emailField).toBeVisible()
  })

  test('添加两个联系人', async ({ page }) => {
    // 添加第一个
    await page.click('.top-bar button:has-text("添加联系人")')
    await page.waitForSelector('.el-dialog', { timeout: 5000 })
    await page.fill('.el-dialog [placeholder="请输入姓名"]', '李四')
    await page.click('.el-dialog__footer button:has-text("确定")')
    await page.waitForTimeout(1000)
    await expect(page.locator('.person-detail .name')).toContainText('李四')

    // 关闭详情面板
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // 添加第二个
    await page.click('.top-bar button:has-text("添加联系人")')
    await page.waitForSelector('.el-dialog', { timeout: 5000 })
    await page.fill('.el-dialog [placeholder="请输入姓名"]', '王五')
    await page.click('.el-dialog__footer button:has-text("确定")')
    await page.waitForTimeout(1000)
    await expect(page.locator('.person-detail .name')).toContainText('王五')

    // 验证后端确实有 2 条数据
    const res = await page.evaluate(async () => {
      const r = await fetch('/api/v1/persons')
      return r.json()
    })
    expect(res.data).toHaveLength(2)
  })

  test('详情面板动态字段增删改', async ({ page }) => {
    await page.click('.top-bar button:has-text("添加联系人")')
    await page.waitForSelector('.el-dialog', { timeout: 5000 })
    await page.fill('.el-dialog [placeholder="请输入姓名"]', '测试用户')
    await page.click('.el-dialog__footer button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 添加新字段
    await page.locator('.person-detail .add-field-row input').first().fill('微信号')
    await page.locator('.person-detail .add-field-row input').nth(1).fill('test_wechat')
    await page.locator('.person-detail .add-field-row button').click()
    await page.waitForTimeout(500)

    // 验证字段出现
    const fieldLabel = page.locator('.person-detail .field-item label').filter({ hasText: '微信号' })
    await expect(fieldLabel).toBeVisible()

    // 删除字段
    await fieldLabel.hover()
    await fieldLabel.locator('.delete-icon').click()
    await page.waitForTimeout(500)

    // 验证字段消失
    await expect(fieldLabel).not.toBeVisible()
  })

  test('搜索联系人并聚焦', async ({ page }) => {
    await page.click('.top-bar button:has-text("添加联系人")')
    await page.waitForSelector('.el-dialog', { timeout: 5000 })
    await page.fill('.el-dialog [placeholder="请输入姓名"]', '赵六')
    await page.click('.el-dialog__footer button:has-text("确定")')
    await page.waitForTimeout(1000)

    // 搜索
    await page.fill('.top-bar .search-box input', '赵六')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)

    // 验证详情面板被打开
    const detailName = page.locator('.person-detail .name')
    await expect(detailName).toContainText('赵六')
  })
})
