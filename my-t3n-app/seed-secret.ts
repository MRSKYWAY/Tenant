import "dotenv/config";
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
const DUFFEL_API_KEY = requiredEnv("DUFFEL_API_KEY");

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

await tenant.maps.entrySet("secrets", "duffel_api_key", DUFFEL_API_KEY);
console.log("Seeded duffel_api_key into z:<tid>:secrets.");

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
