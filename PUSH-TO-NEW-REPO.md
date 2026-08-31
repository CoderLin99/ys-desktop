# 推送到 https://github.com/CoderLin99/ming-web

`ming-web-standalone` 分支已包含完整 Next.js 项目（根目录即 ming-web，非子目录）。

## 方式一：GitHub Actions（推荐，一次配置）

1. 创建 [Fine-grained PAT](https://github.com/settings/tokens?type=beta)，仅授权 `CoderLin99/ming-web` 的 **Contents: Read and write**
2. 在 **ys-desktop** 仓库：`Settings → Secrets and variables → Actions → New repository secret`
   - Name: `MING_WEB_DEPLOY_TOKEN`
   - Value: 上述 PAT
3. 打开 [Publish to ming-web 工作流](https://github.com/CoderLin99/ys-desktop/actions/workflows/publish-to-ming-web.yml)
4. **Run workflow**，Branch 选 `ming-web-standalone`，点击 Run

## 方式二：本机脚本

```bash
cd ys-desktop
git fetch origin ming-web-standalone
git checkout ming-web-standalone
# 可选：export GITHUB_TOKEN=ghp_xxx   # 对 ming-web 有 push 权限的 PAT
chmod +x scripts/push-to-ming-web.sh
./scripts/push-to-ming-web.sh
```

## 方式三：从 bundle 恢复

仓库根目录有 `ming-web-main.bundle`（与 `ming-web-standalone` 同内容）：

```bash
git clone ming-web-main.bundle ming-web
cd ming-web
git remote add origin https://github.com/CoderLin99/ming-web.git
git push -u origin main
```

## 方式四：Cloud Agent 写权限

若希望 Cursor Cloud Agent 直接推送，请在 GitHub **Settings → Applications → Cursor** 中，为 Agent 的安装授权增加 `CoderLin99/ming-web` 仓库的写权限。

## Vercel

Import `CoderLin99/ming-web`，Framework 选 **Next.js**，Root Directory 留 `./`。
