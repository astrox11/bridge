TARGET = nodejs
DIR_ONE = ../core/out/bin
DIR_TWO = ../core/bin

.PHONY: build

build:
	wasm-pack build --target $(TARGET) --out-dir $(DIR_ONE)
	wasm-pack build --target $(TARGET) --out-dir $(DIR_TWO)