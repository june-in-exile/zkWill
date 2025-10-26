/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PERMIT2: string
  readonly VITE_WILL_FACTORY: string
  readonly VITE_CID_UPLOAD_VERIFIER: string
  readonly VITE_WILL_CREATION_VERIFIER: string
  readonly VITE_JSON_CID_VERIFIER: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_DEFAULT_EXECUTOR: string
  readonly VITE_DEFAULT_BENEFICIARY0: string
  readonly VITE_DEFAULT_TOKEN0: string
  readonly VITE_DEFAULT_AMOUNT0: string
  readonly VITE_DEFAULT_BENEFICIARY1: string
  readonly VITE_DEFAULT_TOKEN1: string
  readonly VITE_DEFAULT_AMOUNT1: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
