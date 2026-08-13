import "dotenv/config";
import { readFile } from "fs/promises";
import {
  T3nClient,
  setEnvironment,
  getNodeUrl,
  getScriptVersion,
  loadWasmComponent,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  fetchTrustedManifest,
} from "@terminal3/t3n-sdk";

setEnvironment("testnet");

const wasmComponent = await loadWasmComponent();
const trustAnchor = await fetchTrustedManifest("testnet");
const run = JSON.parse(await readFile(".t3n-rwa-run.json", "utf8"));
const TENANT_SCRIPT = run.scriptName;
const scriptVersion = await getScriptVersion(getNodeUrl(), TENANT_SCRIPT);

const agentClient = await authenticatedClient(requiredEnv("AGENT_KEY"));
const agentAuth = await agentClient.authenticate(
  createEthAuthInput(eth_get_address(requiredEnv("AGENT_KEY"))),
);
const agentDid = agentAuth.value;
console.log("Agent DID:", agentDid);

const userKey = requiredEnv("USER_KEY");
const userClient = await authenticatedClient(userKey);
const userAddress = eth_get_address(userKey);
const userAuth = await userClient.authenticate(createEthAuthInput(userAddress));
const userDid = userAuth.value;
console.log("User DID:", userDid);

const allowedHosts = process.env.RWA_PROVIDER_URL
  ? [new URL(process.env.RWA_PROVIDER_URL).host]
  : [];

const userContractVersion = await getScriptVersion(getNodeUrl(), "tee:user/contracts");
await userClient.execute({
  script_name: "tee:user/contracts",
  script_version: userContractVersion,
  function_name: "agent-auth-update",
  input: {
    agents: [
      {
        agentDid,
        scripts: [
          {
            scriptName: TENANT_SCRIPT,
            versionReq: scriptVersion,
            functions: ["check-eligibility", "run-screening"],
            allowedHosts,
          },
        ],
      },
    ],
  },
});
console.log("User authorized agent for RWA onboarding contract.");

const eligibility = await agentClient.executeAndDecode({
  script_name: TENANT_SCRIPT,
  script_version: scriptVersion,
  function_name: "check-eligibility",
  pii_did: userDid,
  input: {
    asset_id: process.env.RWA_ASSET_ID ?? "fund_alpha",
    jurisdiction: process.env.RWA_JURISDICTION ?? "SG",
    investor_type: process.env.RWA_INVESTOR_TYPE ?? "accredited",
    subscription_amount_usd: Number(process.env.RWA_SUBSCRIPTION_AMOUNT_USD ?? "250000"),
    attestations: {
      kyc_level_1: true,
      sanctions_clear: true,
      accredited: true,
    },
  },
});
console.log("Eligibility result:", JSON.stringify(eligibility, null, 2));

if (process.env.RWA_PROVIDER_URL) {
  const screening = await agentClient.executeAndDecode({
    script_name: TENANT_SCRIPT,
    script_version: scriptVersion,
    function_name: "run-screening",
    pii_did: userDid,
    input: {
      provider_url: process.env.RWA_PROVIDER_URL,
      asset_id: process.env.RWA_ASSET_ID ?? "fund_alpha",
      jurisdiction: process.env.RWA_JURISDICTION ?? "SG",
      investor_type: process.env.RWA_INVESTOR_TYPE ?? "accredited",
      subscription_amount_usd: Number(process.env.RWA_SUBSCRIPTION_AMOUNT_USD ?? "250000"),
    },
  });
  console.log("Screening result:", JSON.stringify(screening, null, 2));
} else {
  console.log("RWA_PROVIDER_URL not set; skipped external provider screening call.");
}

async function authenticatedClient(privateKey: string): Promise<T3nClient> {
  const address = eth_get_address(privateKey);
  const client = new T3nClient({
    wasmComponent,
    trustAnchor,
    handlers: {
      EthSign: metamask_sign(address, undefined, privateKey),
    },
  });
  await client.handshake();
  return client;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
