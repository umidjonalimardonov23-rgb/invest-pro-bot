#!/bin/bash
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🔧 Running codegen..."
pnpm --filter @workspace/api-spec run codegen

echo "🗄️ Pushing DB schema..."
pnpm --filter @workspace/db run push || echo "DB push skipped"

echo "🏗️ Building API server..."
pnpm --filter @workspace/api-server run build

echo "🎨 Building Mini App..."
BASE_PATH=/ pnpm --filter @workspace/miniapp run build

echo "✅ Build complete!"
