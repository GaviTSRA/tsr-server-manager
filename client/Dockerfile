FROM node:20
COPY . /workspace
WORKDIR /workspace/client
EXPOSE 3001
RUN npm install
CMD ["npm", "run", "dev", "--", "--host"]