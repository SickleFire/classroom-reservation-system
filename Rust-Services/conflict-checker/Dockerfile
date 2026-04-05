FROM rustlang/rust:nightly as builder
WORKDIR /usr/src/app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /usr/src/app

# Install OpenSSL runtime libraries
RUN apt-get update && apt-get install -y \
    libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/conflict-checker .

EXPOSE 8080
CMD ["./conflict-checker"]