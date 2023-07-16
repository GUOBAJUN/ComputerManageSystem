FROM node:18

RUN mkdir /TrapServer
WORKDIR /TrapServer

ADD package.json /TrapServer/
RUN npm install --registry=http://registry.npmmirror.com

ADD . /TrapServer/

CMD [ "npm", "start" ]