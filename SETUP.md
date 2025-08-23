# 环境变量设置指南

## 问题解决

如果你遇到以下问题：
- 点击Sign In后出现无限重定向循环
- NextAuth相关错误
- 字体加载失败
- **"Invalid email or password"错误**
- **推荐功能错误（"Error fetching recommendations"）**

请按照以下步骤设置环境变量：

## 步骤1：创建环境变量文件

在项目根目录创建 `.env.local` 文件，内容如下：

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=23f5277f72b500978aeb4592fa4d640e1b4a070ed36d555757083a5f5eb974d6

# Database Configuration (if using Prisma)
DATABASE_URL="file:./dev.db"

# API Keys (optional for development)
VALID_API_KEYS=test-key-1,test-key-2

# Cron API Key (optional for development)
CRON_API_KEY=your-cron-api-key

# CommonApp Integration (optional for development)
COMMONAPP_ENABLED=false
COMMONAPP_CLIENT_ID=your-client-id
COMMONAPP_CLIENT_SECRET=your-client-secret
COMMONAPP_REDIRECT_URI=http://localhost:3000/api/integrations/commonapp/callback
COMMONAPP_API_URL=https://api.commonapp.org
COMMONAPP_WEBHOOK_SECRET=your-webhook-secret
COMMONAPP_RATE_LIMIT_PER_MINUTE=60
COMMONAPP_RATE_LIMIT_PER_HOUR=1000
```

## 步骤2：设置数据库

```bash
# 安装依赖（如果还没有安装）
npm install

# 重置数据库（如果遇到schema不匹配问题）
npx prisma migrate reset --force

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 运行数据库种子数据
npx prisma db seed

# 创建测试用户
npx tsx scripts/create-test-user.ts

# 创建测试档案
npx tsx scripts/create-test-profile.ts
```

## 步骤3：验证设置

运行以下命令验证环境配置：

```bash
# 检查环境变量和数据库连接
npx tsx scripts/check-env.ts

# 测试认证功能
npx tsx scripts/test-auth.ts

# 检查大学数据
npx tsx scripts/check-universities.ts

# 测试推荐功能
npx tsx scripts/test-recommendations.ts
```

## 步骤4：重启开发服务器

```bash
npm run dev
```

## 步骤5：测试登录功能

现在你应该能够：
1. 访问 http://localhost:3000
2. 点击 "Sign In" 按钮
3. 看到登录页面而不是无限重定向
4. 使用以下测试账户登录：
   - 邮箱: `test@example.com`
   - 密码: `password123`
5. 登录后可以看到推荐功能正常工作

## 注意事项

- `.env.local` 文件不会被提交到Git仓库（已在.gitignore中配置）
- 生产环境中请使用不同的 `NEXTAUTH_SECRET`
- 如果仍有问题，请检查控制台错误信息

## 字体问题解决

如果遇到Google Fonts加载失败的问题，项目已经配置了系统字体作为备选方案，不会影响功能使用。

## 故障排除

### "Invalid email or password" 错误

如果遇到此错误，请按以下步骤解决：

1. **检查数据库状态**：
   ```bash
   npx tsx scripts/check-env.ts
   ```

2. **重新创建测试用户**：
   ```bash
   npx tsx scripts/create-test-user.ts
   ```

3. **测试认证功能**：
   ```bash
   npx tsx scripts/test-auth.ts
   ```

4. **如果问题持续，重置数据库**：
   ```bash
   npx prisma migrate reset --force
   npx prisma db seed
   npx tsx scripts/create-test-user.ts
   npx tsx scripts/create-test-profile.ts
   ```

### 推荐功能错误

如果遇到"Error fetching recommendations"错误，请按以下步骤解决：

1. **检查大学数据**：
   ```bash
   npx tsx scripts/check-universities.ts
   ```

2. **如果没有大学数据，重新运行种子**：
   ```bash
   npx prisma db seed
   ```

3. **检查用户档案**：
   ```bash
   npx tsx scripts/create-test-profile.ts
   ```

4. **测试推荐功能**：
   ```bash
   npx tsx scripts/test-recommendations.ts
   ```

### "Invalid time value" 错误

如果遇到"RangeError: Invalid time value"错误，这通常是由于日期转换问题导致的：

1. **问题原因**：
   - 应用表单中的日期处理逻辑有问题
   - 空字符串或undefined值被传递给Date构造函数
   - 日期格式转换失败

2. **解决方案**：
   - 已修复应用表单的日期处理逻辑
   - 添加了空值和undefined的检查
   - 改进了日期格式转换

3. **测试验证**：
   ```bash
   npx tsx scripts/test-fixes.ts
   ```

### 新建应用页面无法返回

如果新建应用页面缺少导航栏和返回按钮：

1. **问题原因**：
   - 新建应用页面没有使用Layout组件
   - 缺少返回按钮
   - 页面结构不完整

2. **解决方案**：
   - 已将新建应用页面改为客户端组件
   - 添加了Layout组件，包含导航栏
   - 添加了"Back to Applications"返回按钮
   - 改进了页面布局和用户体验

3. **测试验证**：
   ```bash
   npx tsx scripts/test-fixes.ts
   ```

### PrismaClient浏览器错误

如果遇到"PrismaClient is unable to run in this browser environment"错误：

1. **问题原因**：
   - 在客户端组件中直接调用了Prisma客户端
   - Prisma客户端只能在服务器端运行
   - 浏览器环境不支持Prisma

2. **解决方案**：
   - 创建了API路由 `/api/universities` 来处理大学数据获取
   - 修改客户端组件使用fetch调用API而不是直接调用Prisma
   - 将数据库操作移到服务器端

3. **测试验证**：
   ```bash
   npx tsx scripts/test-university-api.ts
   ```

### 认证死循环

如果登录时出现无限重定向循环：

1. **问题原因**：
   - 中间件配置中包含了 `/auth/:path*` 路径
   - 认证页面被中间件保护，导致重定向循环
   - 用户无法访问登录页面

2. **解决方案**：
   - 从中间件matcher中移除了 `/auth/:path*`
   - 保留了其他需要保护的路径
   - 确保认证页面可以正常访问

3. **测试验证**：
   ```bash
   npx tsx scripts/test-auth-fix.ts
   ```

### 应用页面PrismaClient错误

如果应用列表页面出现"PrismaClient is unable to run in this browser environment"错误：

1. **问题原因**：
   - 应用页面在客户端组件中直接调用了Prisma
   - 应用服务函数在浏览器环境中运行
   - 违反了Next.js的客户端/服务器端分离原则

2. **解决方案**：
   - 创建了API路由 `/api/applications/list` 来处理应用数据获取
   - 修改客户端组件使用fetch调用API
   - 将数据库操作移到服务器端

3. **测试验证**：
   ```bash
   npx tsx scripts/test-applications-api.ts
   ```

### 应用筛选功能不生效

如果应用列表页面的Status和Application Type筛选功能没有生效：

1. **问题原因**：
   - 筛选器只是在前端过滤数据，没有重新调用API
   - 筛选参数没有传递到后端
   - API路由不支持筛选参数

2. **解决方案**：
   - 修改了应用列表组件，当筛选条件改变时重新调用API
   - 更新了API路由 `/api/applications/list` 支持status和applicationType参数
   - 添加了正确的类型定义和错误处理

3. **测试验证**：
   ```bash
   # 启动开发服务器
   npm run dev
   
   # 在另一个终端运行测试
   npx tsx scripts/test-application-filters.ts
   ```

4. **使用方法**：
   - 访问 http://localhost:3000/applications
   - 使用Status下拉菜单筛选应用状态
   - 使用Application Type下拉菜单筛选申请类型
   - 可以组合使用多个筛选条件

### "useToast must be used within a ToastProvider" 错误

1. **问题原因**：
   - 应用中使用了 `useToast` 但没有提供 `ToastProvider`
   - 组件树中缺少 `ToastProvider`

2. **解决方案**：
   - 确保在应用的根组件中提供 `ToastProvider`
   - 例如，在 `_app.tsx` 中：
     ```bash
     <ToastProvider>
       <Component {...pageProps} />
     </ToastProvider>
     ```

3. **测试验证**：
   ```bash
   npx tsx scripts/test-fixes.ts
   ```

### 其他常见问题

1. **检查数据库连接**：
   ```bash
   npx prisma studio
   ```

2. **检查环境变量**：
   确保 `.env.local` 文件在项目根目录，且格式正确

3. **清除缓存**：
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **权限问题**：
   如果遇到文件权限错误，请以管理员身份运行命令提示符

5. **Prisma错误**：
   如果遇到Prisma相关错误，尝试重新生成客户端：
   ```bash
   npx prisma generate
   ```
