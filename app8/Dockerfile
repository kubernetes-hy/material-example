FROM node:alpine

ARG VERSION
ENV VERSION=$VERSION

WORKDIR /usr/src/app

COPY package* ./

RUN npm ci

COPY . .

CMD ["npm", "start"]