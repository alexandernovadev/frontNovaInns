FROM node:22-slim AS build

WORKDIR /app

ARG NG_APP_API_URL=https://reservationapi.nova-inns.pro/api
ENV NG_APP_API_URL=$NG_APP_API_URL

RUN npm install -g yarn@1.22.22 --force

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine

COPY --from=build /app/dist/front/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80