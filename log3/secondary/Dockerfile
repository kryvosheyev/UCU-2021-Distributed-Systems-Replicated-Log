FROM node:14

RUN mkdir /src

RUN npm install nodemon -g

WORKDIR /src

COPY app/package*.json /src/
COPY . .

RUN npm install

#ADD app/nodemon.json /src/nodemon.json

#EXPOSE 6001

#CMD npm start
CMD node app/server.js --port 6000