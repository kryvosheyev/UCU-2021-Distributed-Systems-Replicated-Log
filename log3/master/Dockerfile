FROM node:14

RUN mkdir /src

#RUN npm install nodemon -g

WORKDIR /src

COPY app/package*.json /src/
#COPY app/server.js /src/
COPY . .


RUN npm install

#ADD app/nodemon.json /src/nodemon.json

#EXPOSE 3000

#CMD npm start
#CMD nodemon -L  server.js --port 3000
#CMD node  server.js --port 3000

CMD node  app/server.js --port 3000