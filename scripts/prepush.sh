#!/usr/bin/env bash

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}====================================================${NC}"
echo -e "${CYAN}${BOLD}   ⚖️  @mizan/app Pre-Push Verification Pipeline    ${NC}"
echo -e "${CYAN}${BOLD}====================================================${NC}\n"

echo -e "${YELLOW}[1/4] 🔍 Typechecking TypeScript with 'tsc --noEmit'...${NC}"
if pnpm typecheck; then
  echo -e "${GREEN}✓ TypeScript check passed!${NC}\n"
else
  echo -e "${RED}❌ TypeScript errors detected. Fix them before pushing.${NC}\n"
  exit 1
fi

echo -e "${YELLOW}[2/4] 🏗️  Running 'pnpm build' (Vite + Postbuild Sitemap)...${NC}"
if pnpm build; then
  echo -e "${GREEN}✓ Vite compilation and sitemap generation succeeded!${NC}\n"
else
  echo -e "${RED}❌ Build failed! Check build output above.${NC}\n"
  exit 1
fi

echo -e "${YELLOW}[3/4] 📂 Verifying output folder ('dist/')...${NC}"
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo -e "${GREEN}✓ 'dist/index.html' exists and is ready for Cloudflare Pages!${NC}\n"
else
  echo -e "${RED}❌ 'dist/index.html' missing after build.${NC}\n"
  exit 1
fi

echo -e "${YELLOW}[4/4] ⚡ Checking wrangler.json validity...${NC}"
if [ -f "wrangler.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('wrangler.json'))" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ wrangler.json is valid JSON!${NC}\n"
  else
    echo -e "${RED}❌ wrangler.json contains invalid JSON syntax.${NC}\n"
    exit 1
  fi
else
  echo -e "${RED}❌ wrangler.json not found in root!${NC}\n"
  exit 1
fi

echo -e "${GREEN}${BOLD}====================================================${NC}"
echo -e "${GREEN}${BOLD}  🎉 ALL CHECKS PASSED! Safe to execute git push.   ${NC}"
echo -e "${GREEN}${BOLD}====================================================${NC}"
