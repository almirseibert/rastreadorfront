# ESTÁGIO 1: Compilação da sua Interface Personalizada (Frontend)
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências primeiro (deixa o deploy mais rápido)
COPY web/package*.json ./
RUN npm install --legacy-peer-deps

# Copia todo o restante da sua pasta web modificada
COPY web/ ./

# Compila o projeto React (Isso gera a pasta pronta /app/build)
RUN npm run build


# ESTÁGIO 2: Preparação do Motor Traccar e Junção (Backend)
FROM traccar/traccar:latest

# Injeta a conexão com o seu banco de dados MySQL
COPY traccar.xml /opt/traccar/conf/traccar.xml

# Limpa a interface original de fábrica do Traccar
RUN rm -rf /opt/traccar/web/*

# Copia apenas a sua interface já compilada do Estágio 1 para dentro do servidor
COPY --from=builder /app/build/ /opt/traccar/web/