FROM node:20
WORKDIR /workspace
COPY . .
WORKDIR /workspace/node
EXPOSE 8771
RUN npm install
CMD ["npm", "run", "dev"]