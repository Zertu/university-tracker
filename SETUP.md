# 环境变量设置指南

## 问题解决

如果你遇到以下问题：
- 点击Sign In后出现无限重定向循环
- NextAuth相关错误
- 字体加载失败
- **"Invalid email or password"错误**

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
```

## 步骤3：验证设置

运行以下命令验证环境配置：

```bash
# 检查环境变量和数据库连接
npx tsx scripts/check-env.ts

# 测试认证功能
npx tsx scripts/test-auth.ts
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
