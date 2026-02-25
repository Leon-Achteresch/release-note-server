FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY src/ src/
COPY tsconfig.json ./

# Default: Server starten. CLI via: docker run <img> node --import tsx src/cli.ts --from v1.0.0
CMD ["node", "--import", "tsx", "src/index.ts"]
