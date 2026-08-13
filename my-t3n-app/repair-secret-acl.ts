import "dotenv/config";
import { readFile } from "fs/promises";
import {
  T3nClient,
  TenantClient,
  setEnvironment,
  getNodeUrl,
  loadWasmComponent,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  fetchTrustedManifest,
} from "@terminal3/t3n-sdk";

setEnvironment("testnet");

const T3N_API_KEY = requiredEnv("T3N_API_KEY");
const run = JSON.parse(await readFile(".t3n-run.json", "utf8")) as {
  contractId?: number;
};

if (!run.contractId) {
  throw new Error("Missing contractId in .t3n-run.json. Run npm run register first.");
}

const wasmComponent = await loadWasmComponent();
const trustAnchor = await fetchTrustedManifest("testnet");
const address = eth_get_address(T3N_API_KEY);

const t3n = new T3nClient({
  wasmComponent,
  trustAnchor,
  handlers: {
    EthSign: metamask_sign(address, undefined, T3N_API_KEY),
  },
});

await t3n.handshake();
const did = await t3n.authenticate(createEthAuthInput(address));
const tenantDid = did.value;

const tenant = new TenantClient({
  t3n,
  baseUrl: getNodeUrl(),
  tenantDid,
});

await tenant.maps.update("secrets", {
  writers: { only: [run.contractId] },
  readers: { only: [run.contractId] },
});

console.log(`Updated z:<tid>:secrets ACL for contract id ${run.contractId}.`);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
