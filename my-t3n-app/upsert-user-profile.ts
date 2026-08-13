import "dotenv/config";
import {
  T3nClient,
  setEnvironment,
  loadWasmComponent,
  eth_get_address,
  metamask_sign,
  createEthAuthInput,
  fetchTrustedManifest,
} from "@terminal3/t3n-sdk";

setEnvironment("testnet");

const userKey = requiredEnv("USER_KEY");
const wasmComponent = await loadWasmComponent();
const trustAnchor = await fetchTrustedManifest("testnet");
const userAddress = eth_get_address(userKey);

const userClient = new T3nClient({
  wasmComponent,
  trustAnchor,
  handlers: {
    EthSign: metamask_sign(userAddress, undefined, userKey),
  },
});

await userClient.handshake();
const userAuth = await userClient.authenticate(createEthAuthInput(userAddress));

const result = await userClient.submitUserInput({
  profile: {
    first_name: process.env.T3N_PROFILE_FIRST_NAME ?? "Jane",
    last_name: process.env.T3N_PROFILE_LAST_NAME ?? "Test",
    date_of_birth: process.env.T3N_PROFILE_DATE_OF_BIRTH ?? "1990-01-01",
    gender: process.env.T3N_PROFILE_GENDER ?? "f",
    country_of_residence: process.env.T3N_PROFILE_COUNTRY ?? "GB",
    document_issuance_country: process.env.T3N_PROFILE_DOCUMENT_COUNTRY ?? "GB",
    address: process.env.T3N_PROFILE_ADDRESS ?? "1 Test Street, London",
  },
});

console.log("Updated profile for:", userAuth.value);
console.log("Profile update result:", JSON.stringify(result, null, 2));

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
