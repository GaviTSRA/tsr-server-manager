FROM node:20
WORKDIR /workspace
COPY . .
WORKDIR /workspace/client
EXPOSE 3001
CMD ["npm", "run", "dev", "--", "--host"]