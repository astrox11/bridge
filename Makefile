.PHONY: all setup util instance ui service

all: setup util instance ui service

util:
	$(MAKE) -C util build

instance:
	-cd instance && bun install
	-cd instance && bun -e "const fs = require('fs'); const p = 'node_modules/libsignal/src/session_record.js'; if (fs.existsSync(p)) { const c = fs.readFileSync(p, 'utf8').split('\n').filter(l => !l.includes('Closing session:') && !l.includes('Removing old closed session:')).join('\n'); fs.writeFileSync(p, c); }"
	-cd instance/node_modules/baileys && bun run build

ui:
	cd ui && bun install && bun run build

service:
	cd service && cargo build --release