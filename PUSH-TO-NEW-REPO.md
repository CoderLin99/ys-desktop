# 推送到 https://github.com/CoderLin99/ming-web

Cloud Agent 对 `ming-web` 新库无写权限，需在本机执行一次（约 10 秒）。

## 方式一：本机有 ys-desktop 克隆（推荐）

```bash
cd ys-desktop
git fetch origin cursor/ming-web-saas-0842
git archive origin/cursor/ming-web-saas-0842 ming-web | tar -x -C /tmp
cd /tmp/ming-web
git init && git add . && git commit -m "init: ming-web standalone"
git branch -M main
git remote add origin https://github.com/CoderLin99/ming-web.git
git push -u origin main
```

## 方式二：从 bundle 恢复（仓库根目录有 `ming-web-main.bundle`）

```bash
git clone /path/to/ming-web-main.bundle ming-web
cd ming-web
git remote add origin https://github.com/CoderLin99/ming-web.git
git push -u origin main
```

## Vercel

Import `CoderLin99/ming-web`，Framework 选 **Next.js**，Root Directory 留 `./`。
