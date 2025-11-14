import { delay, fetchLatestWaWebVersion, makeWASocket, useMultiFileAuthState } from "../../lib/index.js";
import readline from "node:readline"

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

async function startSock() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    const { version } = await fetchLatestWaWebVersion();

    const sock = makeWASocket({
        auth: state,
        version
    });

    if (!sock.authState.creds.registered) {
        await delay(2500)
        const phone = await question("Enter your phone number: ");
        const code = await sock.requestPairingCode(phone as string);
        console.info("Pair code:", code);
    }

    await new Promise((resolve) => sock.ws.on("close", resolve));
}

startSock().catch(err => {
    console.error(err);
    process.exit(1);
});
