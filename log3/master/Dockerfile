FROM node:14

RUN mkdir /app

#RUN npm install nodemon -g

WORKDIR /app

COPY app/package*.json /app/
COPY app/server.js /app/

RUN npm install

#ADD app/nodemon.json /app/nodemon.json

#EXPOSE 3000

#CMD npm start
#CMD nodemon -L  server.js --port 3000
#CMD node  server.js --port 3000

CMD node  server.js --port 3000