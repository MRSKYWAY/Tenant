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

type FlightOffer = {
  id: string;
  passenger_ids: string[];
  total_amount: string;
  total_currency: string;
};

type SearchOffersResponse = {
  offers?: FlightOffer[];
};

setEnvironment("testnet");

const wasmComponent = await loadWasmComponent();
const trustAnchor = await fetchTrustedManifest("testnet");
const run = JSON.parse(await readFile(".t3n-run.json", "utf8"));
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
            functions: ["search-offers", "book-offer"],
            allowedHosts: ["api.duffel.com"],
          },
        ],
      },
    ],
  },
});
console.log("User authorized agent for contract egress.");

const search = (await agentClient.executeAndDecode({
  script_name: TENANT_SCRIPT,
  script_version: scriptVersion,
  function_name: "search-offers",
  pii_did: userDid,
  input: {
    origin: "LHR",
    destination: "JFK",
    departure_date: "2026-09-15",
    cabin_class: "economy",
    adult_count: 1,
  },
})) as SearchOffersResponse;
console.log("Search result:", JSON.stringify(search, null, 2));

const offer = search.offers?.[0];
if (!offer) {
  throw new Error("No offers returned from search-offers.");
}

const booking = await agentClient.executeAndDecode({
  script_name: TENANT_SCRIPT,
  script_version: scriptVersion,
  function_name: "book-offer",
  pii_did: userDid,
  input: {
    offer_id: offer.id,
    passenger_id: offer.passenger_ids[0],
    total_amount: offer.total_amount,
    total_currency: offer.total_currency,
  },
});
console.log("Booking result:", JSON.stringify(booking, null, 2));

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
