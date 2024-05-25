MAIN = ./src/main.ts
BIN = rokahon
CONFIG = ./src/deno.json

compile:
	deno compile %* -A --output $(BIN) --config=$(CONFIG) $(MAIN) --is_compiled_binary

cache:
	deno cache --config=$(CONFIG) --lock-write $(MAIN)

server:
	deno run -A --config=$(CONFIG) $(MAIN)

update-test:
	deno test -A --config=$(CONFIG) ./tests -- --update

test:
	deno test -A --config=$(CONFIG) ./tests