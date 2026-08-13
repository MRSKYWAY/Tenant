import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
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
console.log("Connected as:", tenantDid);

const tenant = new TenantClient({
  t3n,
  baseUrl: getNodeUrl(),
  tenantDid,
});

await tenant.tenant.me();
console.log("TenantClient ready.");

if (process.argv.includes("--register")) {
  const WASM_PATH =
    process.env.WASM_PATH ??
    "../z-tenant-flight/target/wasm32-wasip2/release/z_tenant_flight.wasm";
  const CONTRACT_TAIL = process.env.CONTRACT_TAIL ?? "travel-contracts";
  const CONTRACT_VERSION = process.env.CONTRACT_VERSION ?? "0.1.0";

  const wasmBytes = await readFile(WASM_PATH);
  const result = await tenant.contracts.register({
    tail: CONTRACT_TAIL,
    version: CONTRACT_VERSION,
    wasm: wasmBytes,
  });

  const contractId = result.contract_id;
  const tenantId = tenantDid.slice("did:t3n:".length);
  const scriptName = `z:${tenantId}:${CONTRACT_TAIL}`;

  try {
    await tenant.maps.create({
      tail: "secrets",
      visibility: "private",
      writers: { only: [contractId] },
      readers: { only: [contractId] },
    });
    console.log("created z:<tid>:secrets map.");
  } catch (error) {
    if (String(error).toLowerCase().includes("map already exists")) {
      await tenant.maps.update("secrets", {
        writers: { only: [contractId] },
        readers: { only: [contractId] },
      });
      console.log("z:<tid>:secrets map already exists; updated ACL for current contract.");
    } else {
      throw error;
    }
  }

  if (process.env.DUFFEL_API_KEY) {
    await tenant.maps.entrySet("secrets", "duffel_api_key", process.env.DUFFEL_API_KEY);
    console.log("API key sealed in z:<tid>:secrets.");
  } else {
    console.log("DUFFEL_API_KEY not set; skipped secrets seeding.");
  }

  await writeFile(
    ".t3n-run.json",
    JSON.stringify(
      {
        tenantDid,
        tenantId,
        scriptName,
        contractTail: CONTRACT_TAIL,
        contractVersion: CONTRACT_VERSION,
        contractId,
        registeredAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log(`registered ${scriptName} as contract id ${contractId}`);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
