FROM node:14-alpine

RUN apk add python3 make gcc g++

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm i

COPY . .