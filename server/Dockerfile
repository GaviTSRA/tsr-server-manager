FROM node:20
WORKDIR /workspace
COPY . .
WORKDIR /workspace/server
EXPOSE 3000
RUN npm install
CMD ["npm", "run", "dev"]