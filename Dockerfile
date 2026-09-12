FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY prisma ./prisma/

# Install dependencies
RUN npm install
RUN npm --prefix backend install
RUN npm --prefix frontend install

# Copy source code
COPY . .

# Build backend and frontend
RUN npm run build
RUN npm run db:seed

# Production runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app ./

RUN mkdir -p uploads generated

EXPOSE 5000

CMD ["npm", "start"]
