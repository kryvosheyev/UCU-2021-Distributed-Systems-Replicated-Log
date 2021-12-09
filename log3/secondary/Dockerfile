FROM node:14

RUN mkdir /src

RUN npm install nodemon -g

WORKDIR /src

COPY package*.json /src

RUN npm install

ADD app/nodemon.json /src/nodemon.json

EXPOSE 6001

CMD npm start