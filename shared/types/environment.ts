interface TokenApproval {
  TESTATOR_PRIVATE_KEY: string;
  PERMIT2: string;
}

interface PredictWill {
  WILL_FACTORY: string;
}

interface PermitSigning {
  TESTATOR_PRIVATE_KEY: string;
}

interface UploadCid {
  WILL_FACTORY: string;
  TESTATOR_PRIVATE_KEY: string;
  CID: string;
  WITNESS1: string;
  WITNESS2: string;
}

interface SubmitProof {
  MULTIPLIER2_VERIFIER?: string;
  CID_UPLOAD_VERIFIER?: string;
  WILL_CREATION_VERIFIER?: string;
}

interface IpfsDownload {
  CID: string;
}

interface WitnessSigning {
  WITNESS1_PRIVATE_KEY: string;
  WITNESS2_PRIVATE_KEY: string;
  CID: string;
}

interface NotarizeCid {
  WILL_FACTORY: string;
  NOTARY_PRIVATE_KEY: string;
  CID: string;
  WITNESS1_SIGNATURE: string;
  WITNESS2_SIGNATURE: string;
}

interface CreateWill {
  WILL_FACTORY: string;
  EXECUTOR_PRIVATE_KEY: string;
  CID: string;
}

interface ProbateWill {
  ORACLE_PRIVATE_KEY: string;
  WILL_FACTORY: string;
  CID: string;
}

interface SignatureTransfer {
  EXECUTOR_PRIVATE_KEY: string;
}

export type {
  TokenApproval,
  PredictWill,
  PermitSigning,
  UploadCid,
  SubmitProof,
  IpfsDownload,
  WitnessSigning,
  NotarizeCid,
  CreateWill,
  ProbateWill,
  SignatureTransfer,
};
