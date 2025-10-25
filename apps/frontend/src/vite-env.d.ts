/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PERMIT2: string
  readonly VITE_WILL_FACTORY: string
  readonly VITE_CID_UPLOAD_VERIFIER: string
  readonly VITE_WILL_CREATION_VERIFIER: string
  readonly VITE_JSON_CID_VERIFIER: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
