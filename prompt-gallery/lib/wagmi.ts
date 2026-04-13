import { cookieStorage, createStorage } from "wagmi";
import { mainnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = "4d048217f86d8a96ec3f7e7dde68b973";

export const networks = [mainnet];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
});
