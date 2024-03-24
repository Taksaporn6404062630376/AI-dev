FROM node:16-alpine

ENV NODE_ENV=production

WORKDIR /app/backend

COPY ["package.json", "package-lock.json", "./"]

# RUN npm install
RUN npm ci

COPY . .

CMD ["npm", "start"]


