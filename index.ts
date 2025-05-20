import "dotenv/config";
import { appendFileSync } from "fs";
import { toSimple7702SmartAccount } from "viem/account-abstraction";
import { toSafeSmartAccount } from "permissionless/accounts";
import {
  Hex,
  createPublicClient,
  defineChain,
  formatEther,
  formatUnits,
  parseUnits,
  http,
  parseAbi,
  zeroAddress,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { entryPoint07Address, UserOperation } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { parseEther } from "ethers";
import { exit } from "process";
import ERC20Abi from "./utils/ABIs/ERC20.json";

const buildbearSandboxUrl = "https://rpc.buildbear.io/sandboxID}";
const buildbearChainId = 1;

const BBSandboxNetwork = /*#__PURE__*/ defineChain({
  id: buildbearChainId, // IMPORTANT : replace this with your sandbox's chain id
  name: "BuildBear x Polygon Mainnet Sandbox", // name your network
  nativeCurrency: { name: "BBETH", symbol: "BBETH", decimals: 18 }, // native currency of forked network
  rpcUrls: {
    default: {
      http: [buildbearSandboxUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BuildBear x Polygon Mainnet Scan", // block explorer for network
      url: "https://explorer.buildbear.io/sandboxID}",
      apiUrl: "https://api.buildbear.io/sandboxID}/api",
    },
  },
});

const privateKey = (process.env.PRIVATE_KEY as Hex)
  ? (process.env.PRIVATE_KEY as Hex)
  : (() => {
      const pk = generatePrivateKey();
      appendFileSync(".env", `\nPRIVATE_KEY=${pk}`);
      return pk;
    })();

export const publicClient = createPublicClient({
  chain: BBSandboxNetwork,
  transport: http(buildbearSandboxUrl), //@>>> Put in buildbear rpc
});

const pimlicoClient = createPimlicoClient({
  transport: http(buildbearSandboxUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});

const signer = privateKeyToAccount(privateKey);

const simple7702Account = await toSimple7702SmartAccount({
  client: publicClient,
  owner: signer,
});

const smartAccountClient = createSmartAccountClient({
  account: simple7702Account,
  chain: BBSandboxNetwork,
  bundlerTransport: http(buildbearSandboxUrl), //sending the tx to buildbear
  paymaster: pimlicoClient,
  userOperation: {
    estimateFeesPerGas: async () => {
      return (await pimlicoClient.getUserOperationGasPrice()).fast;
    },
  },
});

let balance = await publicClient.getBalance({
  address: simple7702Account.address,
}); // Get the balance of the sender

if (+balance.toString() <= 0) {
  console.log("====================================");
  console.log(
    `⚠️⚠️Fund your Account with NATIVE tokens from your BuildBear Sandbox Faucet and try running the script again.\nSmart Account Address: ${simple7702Account.address}`
  );
  console.log("====================================");
  exit();
}

const isSmartAccountDeployed = await smartAccountClient.account.isDeployed();

let transactionHash: Hex;

// We only have to add the authorization field if the EOA does not have the authorization code set
if (!isSmartAccountDeployed) {
  transactionHash = await smartAccountClient.sendTransaction({
    to: zeroAddress,
    value: 0n,
    data: "0x",
    authorization: await signer.signAuthorization({
      address: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
      chainId: buildbearChainId,
      nonce: await publicClient.getTransactionCount({
        address: signer.address,
      }),
    }),
  });
} else {
  transactionHash = await smartAccountClient.sendTransaction({
    to: zeroAddress,
    value: 0n,
    data: "0x",
  });
}

let transactionHash_2: Hex;

// We only have to add the authorization field if the EOA does not have the authorization code set
if (!isSmartAccountDeployed) {
  transactionHash_2 = await smartAccountClient.sendTransaction({
    calls: [
      {
        to: zeroAddress,
        value: 0n,
        data: "0x",
      },
      {
        to: zeroAddress,
        value: 0n,
        data: "0x",
      },
    ],
    authorization: await signer.signAuthorization({
      address: "0xe6Cae83BdE06E4c305530e199D7217f42808555B",
      chainId: buildbearChainId,
      nonce: await publicClient.getTransactionCount({
        address: signer.address,
      }),
    }),
  });
} else {
  transactionHash_2 = await smartAccountClient.sendTransaction({
    calls: [
      {
        to: zeroAddress,
        value: 0n,
        data: "0x",
      },
      {
        to: zeroAddress,
        value: 0n,
        data: "0x",
      },
    ],
  });
}

// Helper Functions

// get USDT Balance of Smart Account
async function getUSDTBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  return formatUnits(res as bigint, 6).toString();
}

// get DAI Balance of Smart Account
async function getDAIBalance(): Promise<string> {
  let res = await publicClient.readContract({
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  return formatUnits(res as bigint, 18).toString();
}
