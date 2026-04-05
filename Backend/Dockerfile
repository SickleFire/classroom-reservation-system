FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package.json from root
COPY package*.json ./

RUN npm install --production

# Copy backend source code
COPY Backend ./Backend
COPY Frontend ./Frontend

EXPOSE 7878
CMD ["node", "Backend/main.js"]