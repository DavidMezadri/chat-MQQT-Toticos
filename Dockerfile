# Base: Ubuntu puro
FROM ubuntu:latest

# Atualiza pacotes e instala Mosquitto + clientes
RUN apt update && \
    apt install -y mosquitto mosquitto-clients && \
    apt clean && rm -rf /var/lib/apt/lists/*

# Cria diretórios para logs e dados
RUN mkdir -p /mosquitto/config /mosquitto/data /mosquitto/log

# Cria o arquivo de configuração do Mosquitto
RUN echo "listener 1883\n\
protocol mqtt\n\
\n\
listener 9001\n\
protocol websockets\n\
\n\
allow_anonymous true\n\
persistence true\n\
persistence_location /mosquitto/data/\n\
log_dest file /mosquitto/log/mosquitto.log\n" > /mosquitto/config/mosquitto.conf

# Define o diretório de trabalho
WORKDIR /mosquitto

# Expõe as portas MQTT e WebSocket
EXPOSE 1883 9001

# Comando padrão: inicia o Mosquitto com a config criada
CMD ["mosquitto", "-c", "/mosquitto/config/mosquitto.conf"]
