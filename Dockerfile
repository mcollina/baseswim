FROM mhart/alpine-node:4

# uncomment for dev
# RUN apk update && \
#     apk add make gcc g++ python git

RUN mkdir /src
ADD package.json /src/

WORKDIR /src

# comment in dev
RUN apk update && \
    apk add make gcc g++ python git && \
    npm install --production && \
    apk del make gcc g++ python git

# uncomment for dev
# RUN npm install --production

COPY . /src

EXPOSE 3000
ENTRYPOINT ["node", "baseswim.js"]
