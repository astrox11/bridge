TARGET = nodejs
OUT = ../bot/pkg
PROFILE = release

export RUSTFLAGS = -C opt-level=z -C lto -C embed-bitcode=yes

.PHONY: build clean

build:
	wasm-pack build --$(PROFILE) --target $(TARGET) --out-dir $(OUT) --no-typescript

clean:
	rm -rf target $(OUT)