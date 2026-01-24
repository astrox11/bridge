.PHONY: all setup build-util build-src

all: setup build-util build-src

setup:
	cd api && go mod download && go mod tidy

build-util:
	$(MAKE) -C util build

build-src:
	-cd src && bun -e "const fs = require('fs'); const p = 'node_modules/libsignal/src/session_record.js'; if (fs.existsSync(p)) { const c = fs.readFileSync(p, 'utf8').split('\n').filter(l => !l.includes('Closing session:') && !l.includes('Removing old closed session:')).join('\n'); fs.writeFileSync(p, c); }"
	-cd src/node_modules/baileys && bun run build