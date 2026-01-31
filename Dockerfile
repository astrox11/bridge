FROM oven/bun:latest

RUN apt-get update && apt-get install -y \
    git \
    curl \
    ffmpeg \
    libwebp-dev \
    ca-certificates \
    redis-server \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup target add wasm32-unknown-unknown

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

RUN git clone https://github.com/astrox11/Whatsaly /root/Whatsaly

WORKDIR /root/Whatsaly

RUN make all

# Build Svelte UI
WORKDIR /root/Whatsaly/ui
RUN bun install && bun run build

# Build Rust service
WORKDIR /root/Whatsaly/service
RUN cargo build --release

EXPOSE 8080 6379

WORKDIR /root/Whatsaly

CMD ["sh", "-c", "redis-server --port 6379 --daemonize yes && ./process.sh"]
