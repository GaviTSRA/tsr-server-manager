FROM node:20
WORKDIR /workspace
COPY . .
WORKDIR /workspace/client
EXPOSE 3001
RUN npm install
CMD ["npm", "run", "dev", "--", "--host"]