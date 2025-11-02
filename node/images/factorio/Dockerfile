FROM debian:bookworm-slim

# Configuration
ENV FACTORIO_DIR=/server
ENV FACTORIO_USER=factorio

# Create factorio user and directory
RUN useradd -r -m -d ${FACTORIO_DIR} ${FACTORIO_USER} && \
    mkdir -p ${FACTORIO_DIR}/saves ${FACTORIO_DIR}/data && \
    chown -R ${FACTORIO_USER}:${FACTORIO_USER} ${FACTORIO_DIR}

RUN apt update
RUN apt install xz-utils -y
RUN apt install curl -y
RUN apt install screen -y