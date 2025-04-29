# ┌──────────────────────────────┐
# │ 1) Build frontend (Vite)     │
# └──────────────────────────────┘
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
ARG VITE_SERVER_URL
ARG VITE_CLIENT_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
ENV VITE_CLIENT_URL=${VITE_CLIENT_URL}
RUN npm install

COPY client/ .
RUN npm run build

# ┌──────────────────────────────┐
# │ 2) Build backend (Express)   │
# └──────────────────────────────┘
FROM node:20-alpine AS server-builder
WORKDIR /app

COPY server/package*.json ./
RUN npm install --production

COPY server/ .

# copy build frontend từ stage trước vào public của Express
COPY --from=client-builder /app/client/dist ./public

EXPOSE 8080

CMD ["node", "index.js"]
