FROM node:18

RUN mkdir /Server
WORKDIR /Server
ADD package.json /Server/

RUN npm install --registry=http://registry.npmmirror.com

ADD . /Server/

EXPOSE 10086

CMD [ "npm", "start" ]