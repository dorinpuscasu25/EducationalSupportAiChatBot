FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG VITE_API_URL=/api
ARG VITE_APP_NAME
ARG VITE_ACADEMY_NAME
ENV VITE_API_URL=$VITE_API_URL VITE_APP_NAME=$VITE_APP_NAME VITE_ACADEMY_NAME=$VITE_ACADEMY_NAME
RUN npm run build

# nginx serves the app and proxies /api and /uploads to the API, so the
# browser talks to a single origin (no CORS in production).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
