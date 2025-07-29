# Etapa de build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa de deploy
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
