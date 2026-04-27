# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: relationship.spec.ts >> 个人关系库 E2E 测试 >> 添加两个联系人
- Location: e2e\relationship.spec.ts:37:3

# Error details

```
Error: expect(locator).not.toBeVisible() failed

Locator:  locator('.empty-content')
Expected: not visible
Received: visible
Timeout:  5000ms

Call log:
  - Expect "not toBeVisible" with timeout 5000ms
  - waiting for locator('.empty-content')
    9 × locator resolved to <div data-v-ce3dcc88="" class="empty-content">…</div>
      - unexpected value "visible"

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: ◈
      - generic [ref=e8]: 关系库
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic:
          - search
      - textbox "搜索联系人..." [ref=e13]
    - generic [ref=e14]:
      - button "添加联系人" [ref=e15] [cursor=pointer]:
        - img [ref=e17]
        - generic [ref=e19]: 添加联系人
      - button "撤销" [disabled] [ref=e20]:
        - img [ref=e22]
        - generic [ref=e24]: 撤销
      - button "重做" [disabled] [ref=e25]:
        - img [ref=e27]
        - generic [ref=e29]: 重做
  - generic [ref=e30]:
    - generic [ref=e31]:
      - img [ref=e34] [cursor=pointer]
      - generic [ref=e36]:
        - generic [ref=e37]:
          - heading "分组" [level=3] [ref=e38]
          - button "新建分组" [ref=e39] [cursor=pointer]:
            - img [ref=e41]
            - generic [ref=e43]: 新建分组
        - generic [ref=e44]:
          - heading "数据" [level=3] [ref=e45]
          - button "导出 JSON" [ref=e46] [cursor=pointer]:
            - img [ref=e48]
            - generic [ref=e50]: 导出 JSON
          - button "导入 JSON" [ref=e51] [cursor=pointer]:
            - img [ref=e53]
            - generic [ref=e55]: 导入 JSON
    - generic [ref=e56]:
      - generic:
        - generic:
          - generic: ◈
          - heading "欢迎使用个人关系库" [level=2]
          - paragraph:
            - text: 点击上方「添加联系人」或双击画布空白处
            - text: 添加第一个联系人
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('个人关系库 E2E 测试', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/')
  6   |     await page.waitForSelector('.g6-container, .empty-state, .top-bar', { timeout: 10000 })
  7   |     await page.waitForTimeout(500)
  8   |   })
  9   | 
  10  |   test('首页显示空状态引导', async ({ page }) => {
  11  |     const emptyText = page.locator('.empty-content h2')
  12  |     await expect(emptyText).toContainText('欢迎使用个人关系库')
  13  |   })
  14  | 
  15  |   test('添加联系人并显示详情', async ({ page }) => {
  16  |     await page.click('.top-bar button:has-text("添加联系人")')
  17  |     await page.waitForSelector('.el-dialog', { timeout: 5000 })
  18  | 
  19  |     await page.fill('.el-dialog [placeholder="请输入姓名"]', '张三')
  20  |     await page.fill('.el-dialog [placeholder="电话号码"]', '13800138000')
  21  |     await page.fill('.el-dialog [placeholder="邮箱地址"]', 'zhangsan@test.com')
  22  | 
  23  |     await page.click('.el-dialog__footer button:has-text("确定")')
  24  |     await page.waitForTimeout(1000)
  25  | 
  26  |     // 验证详情面板打开并显示姓名
  27  |     const detailName = page.locator('.person-detail .name')
  28  |     await expect(detailName).toContainText('张三')
  29  | 
  30  |     // 验证 data 字段中的电话和邮箱
  31  |     const phoneField = page.locator('.person-detail .field-item label').filter({ hasText: 'phone' })
  32  |     await expect(phoneField).toBeVisible()
  33  |     const emailField = page.locator('.person-detail .field-item label').filter({ hasText: 'email' })
  34  |     await expect(emailField).toBeVisible()
  35  |   })
  36  | 
  37  |   test('添加两个联系人', async ({ page }) => {
  38  |     // 添加第一个
  39  |     await page.click('.top-bar button:has-text("添加联系人")')
  40  |     await page.waitForSelector('.el-dialog', { timeout: 5000 })
  41  |     await page.fill('.el-dialog [placeholder="请输入姓名"]', '李四')
  42  |     await page.click('.el-dialog__footer button:has-text("确定")')
  43  |     await page.waitForTimeout(1000)
  44  |     await expect(page.locator('.person-detail .name')).toContainText('李四')
  45  | 
  46  |     // 关闭详情面板
  47  |     await page.keyboard.press('Escape')
  48  |     await page.waitForTimeout(300)
  49  | 
  50  |     // 添加第二个
  51  |     await page.click('.top-bar button:has-text("添加联系人")')
  52  |     await page.waitForSelector('.el-dialog', { timeout: 5000 })
  53  |     await page.fill('.el-dialog [placeholder="请输入姓名"]', '王五')
  54  |     await page.click('.el-dialog__footer button:has-text("确定")')
  55  |     await page.waitForTimeout(1000)
  56  |     await expect(page.locator('.person-detail .name')).toContainText('王五')
  57  | 
  58  |     // 验证后端数据：刷新页面后空状态应消失
  59  |     await page.reload()
  60  |     await page.waitForSelector('.g6-container, .empty-state, .top-bar', { timeout: 10000 })
  61  |     await page.waitForTimeout(2000)
> 62  |     await expect(page.locator('.empty-content')).not.toBeVisible()
      |                                                      ^ Error: expect(locator).not.toBeVisible() failed
  63  |   })
  64  | 
  65  |   test('详情面板动态字段增删改', async ({ page }) => {
  66  |     await page.click('.top-bar button:has-text("添加联系人")')
  67  |     await page.waitForSelector('.el-dialog', { timeout: 5000 })
  68  |     await page.fill('.el-dialog [placeholder="请输入姓名"]', '测试用户')
  69  |     await page.click('.el-dialog__footer button:has-text("确定")')
  70  |     await page.waitForTimeout(1000)
  71  | 
  72  |     // 添加新字段
  73  |     await page.locator('.person-detail .add-field-row input').first().fill('微信号')
  74  |     await page.locator('.person-detail .add-field-row input').nth(1).fill('test_wechat')
  75  |     await page.locator('.person-detail .add-field-row button').click()
  76  |     await page.waitForTimeout(500)
  77  | 
  78  |     // 验证字段出现
  79  |     const fieldLabel = page.locator('.person-detail .field-item label').filter({ hasText: '微信号' })
  80  |     await expect(fieldLabel).toBeVisible()
  81  | 
  82  |     // 删除字段
  83  |     await fieldLabel.hover()
  84  |     await fieldLabel.locator('.delete-icon').click()
  85  |     await page.waitForTimeout(500)
  86  | 
  87  |     // 验证字段消失
  88  |     await expect(fieldLabel).not.toBeVisible()
  89  |   })
  90  | 
  91  |   test('搜索联系人并聚焦', async ({ page }) => {
  92  |     await page.click('.top-bar button:has-text("添加联系人")')
  93  |     await page.waitForSelector('.el-dialog', { timeout: 5000 })
  94  |     await page.fill('.el-dialog [placeholder="请输入姓名"]', '赵六')
  95  |     await page.click('.el-dialog__footer button:has-text("确定")')
  96  |     await page.waitForTimeout(1000)
  97  | 
  98  |     // 搜索
  99  |     await page.fill('.top-bar .search-box input', '赵六')
  100 |     await page.keyboard.press('Enter')
  101 |     await page.waitForTimeout(500)
  102 | 
  103 |     // 验证详情面板被打开
  104 |     const detailName = page.locator('.person-detail .name')
  105 |     await expect(detailName).toContainText('赵六')
  106 |   })
  107 | })
  108 | 
```