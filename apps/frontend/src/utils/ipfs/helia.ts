/**
 * IPFS utilities using Helia for browser
 */

import { createHelia } from 'helia';
import { json } from '@helia/json';
import type { Helia } from 'helia';
import type { JSON as HeliaJSON } from '@helia/json';
import { CID } from 'multiformats/cid';

let heliaInstance: Helia | null = null;
let jsonHandler: HeliaJSON | null = null;

/**
 * Initialize Helia instance (singleton pattern)
 */
export const getHeliaInstance = async (): Promise<{ helia: Helia; json: HeliaJSON }> => {
  if (heliaInstance && jsonHandler) {
    return { helia: heliaInstance, json: jsonHandler };
  }

  heliaInstance = await createHelia();
  jsonHandler = json(heliaInstance);

  return { helia: heliaInstance, json: jsonHandler };
};

/**
 * Upload JSON data to IPFS
 */
export const uploadToIPFS = async <T>(data: T): Promise<string> => {
  const { json: jsonHandler } = await getHeliaInstance();
  const cid = await jsonHandler.add(data);
  return cid.toString();
};

/**
 * Download JSON data from IPFS
 */
export const downloadFromIPFS = async <T>(cidString: string): Promise<T> => {
  const { json: jsonHandler } = await getHeliaInstance();
  const cid = CID.parse(cidString);
  const data = await jsonHandler.get(cid);
  return data as T;
};

/**
 * Stop Helia instance
 */
export const stopHelia = async (): Promise<void> => {
  if (heliaInstance) {
    await heliaInstance.stop();
    heliaInstance = null;
    jsonHandler = null;
  }
};

/**
 * Get IPFS gateway URLs for a CID
 */
export const getGatewayUrls = (cid: string): string[] => {
  return [
    `http://localhost:8080/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://gateway.ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];
};
