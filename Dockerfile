FROM node:20-alpine AS builder

WORKDIR /app

COPY server/package*.json ./

RUN npm install --production

COPY server/ .

EXPOSE 8080

CMD ["node", "index.js"]