FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared-kernel/package.json packages/shared-kernel/
COPY apps/admin-api/package.json apps/admin-api/
RUN pnpm install --filter @ptt/admin-api... --frozen-lockfile || pnpm install --filter @ptt/admin-api...

FROM deps AS build
COPY packages/shared-kernel packages/shared-kernel
COPY apps/admin-api apps/admin-api
COPY tsconfig.base.json ./
RUN pnpm --filter @ptt/shared-kernel build
WORKDIR /app/apps/admin-api
RUN pnpm exec prisma generate
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/admin-api/dist ./dist
COPY --from=build /app/apps/admin-api/package.json ./
COPY --from=build /app/apps/admin-api/node_modules ./node_modules
COPY --from=build /app/apps/admin-api/prisma ./prisma
COPY --from=build /app/node_modules ./root_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
