FROM mhart/alpine-node:4

# at the top to speed builds up
# squash together with npm install before official release
RUN apk update && \
    apk add make gcc g++ python git

RUN mkdir /src
ADD package.json /src/

WORKDIR /src

# If you need npm, don't use a base tag
# RUN npm install
RUN npm install --production

COPY . /src

EXPOSE 3000
ENTRYPOINT ["node", "baseswim.js"]
