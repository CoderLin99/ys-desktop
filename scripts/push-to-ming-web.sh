#!/usr/bin/env bash
# 将当前 ming-web-standalone 分支推送到 CoderLin99/ming-web 的 main 分支
# 用法：在 ys-desktop 仓库根目录执行 ./scripts/push-to-ming-web.sh
# 需具备 ming-web 仓库 push 权限（GitHub 登录或 GITHUB_TOKEN / PAT 环境变量）

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 目标远程与分支
TARGET_REMOTE="${MING_WEB_REMOTE:-https://github.com/CoderLin99/ming-web.git}"
TARGET_BRANCH="${MING_WEB_BRANCH:-main}"
SOURCE_BRANCH="${MING_WEB_SOURCE_BRANCH:-ming-web-standalone}"

# 若设置了 GITHUB_TOKEN，嵌入 HTTPS URL 以便非交互推送
if [ -n "${GITHUB_TOKEN:-}" ]; then
  TARGET_REMOTE="https://x-access-token:${GITHUB_TOKEN}@github.com/CoderLin99/ming-web.git"
fi

git fetch origin "$SOURCE_BRANCH"
git checkout "$SOURCE_BRANCH"
git push "$TARGET_REMOTE" "HEAD:${TARGET_BRANCH}" --force

echo "已推送 ${SOURCE_BRANCH} → ming-web/${TARGET_BRANCH}"
