MAIN = ./src/main.ts
BIN = rokahon
CONFIG = ./src/config.json

compile:
	deno compile %* -A --output $(BIN) --config=$(CONFIG) $(MAIN) --is_compiled_binary

cache:
	deno cache --config=$(CONFIG) --lock-write $(MAIN)

server:
	deno run -A --config=$(CONFIG) $(MAIN)

test:
	deno test -A --config=$(CONFIG) ./tests %*