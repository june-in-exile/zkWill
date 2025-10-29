/**
 * IPFS utilities using Helia for browser
 *
 * IMPORTANT NOTE:
 * Helia in browser only stores data temporarily in memory.
 * For production, you should use one of these solutions:
 * 1. Pin to a remote pinning service (Pinata, Web3.Storage, etc.)
 * 2. Run a local IPFS daemon
 * 3. Use persistent datastore (IndexedDB) - but data still won't be accessible from other nodes
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
 *
 * Note: This creates a browser-based IPFS node. Data uploaded here is:
 * - Stored temporarily in browser memory
 * - NOT automatically replicated to the public IPFS network
 * - Lost when the browser tab is closed or refreshed
 *
 * For persistence across sessions, use HTTP gateways for downloads.
 */
export const getHeliaInstance = async (): Promise<{ helia: Helia; json: HeliaJSON }> => {
  if (heliaInstance && jsonHandler) {
    console.log('[Helia] Reusing existing instance');
    return { helia: heliaInstance, json: jsonHandler };
  }

  console.log('[Helia] Creating new instance...');
  console.warn('[Helia] ⚠️ Browser-based Helia node - data is temporary and not published to IPFS network');

  heliaInstance = await createHelia();
  jsonHandler = json(heliaInstance);

  console.log('[Helia] Instance created successfully');
  console.log('[Helia] Peer ID:', heliaInstance.libp2p.peerId.toString());

  return { helia: heliaInstance, json: jsonHandler };
};

/**
 * Upload JSON data to IPFS and cache locally
 */
export const uploadToIPFS = async <T>(data: T): Promise<string> => {
  console.log('📤 [uploadToIPFS] Starting upload...');
  console.log('[uploadToIPFS] Data type:', typeof data);
  console.log('[uploadToIPFS] Data:', data);

  const { json: jsonHandler } = await getHeliaInstance();
  console.log('[uploadToIPFS] Helia instance ready');

  const cid = await jsonHandler.add(data);
  const cidString = cid.toString();

  console.log('✅ [uploadToIPFS] Upload complete!');
  console.log('[uploadToIPFS] CID:', cidString);
  console.log('[uploadToIPFS] CID version:', cid.version);
  console.log('[uploadToIPFS] CID codec:', cid.code);

  // Cache data in localStorage for cross-page access
  try {
    const cacheKey = `ipfs_cache_${cidString}`;
    localStorage.setItem(cacheKey, JSON.stringify(data));
    console.log('[uploadToIPFS] 💾 Data cached in localStorage');
  } catch (error) {
    console.warn('[uploadToIPFS] ⚠️ Failed to cache data in localStorage:', error);
  }

  return cidString;
};

/**
 * Download JSON data from IPFS with localStorage cache and gateway fallback
 */
export const downloadFromIPFS = async <T>(cidString: string): Promise<T> => {
  console.log('📥 [downloadFromIPFS] Starting download...');
  console.log('[downloadFromIPFS] CID:', cidString);

  // Method 1: Try localStorage cache first
  try {
    const cacheKey = `ipfs_cache_${cidString}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      console.log('✅ [downloadFromIPFS] Found in localStorage cache!');
      const data = JSON.parse(cached);
      console.log('[downloadFromIPFS] Cached data:', data);
      return data as T;
    } else {
      console.log('[downloadFromIPFS] Not found in localStorage cache');
    }
  } catch (cacheError) {
    console.warn('[downloadFromIPFS] localStorage cache check failed:', cacheError);
  }

  // Method 2: Try Helia P2P
  try {
    console.log('[downloadFromIPFS] Method 2: Attempting download via Helia P2P...');
    const { json: jsonHandler } = await getHeliaInstance();
    const cid = CID.parse(cidString);
    console.log('[downloadFromIPFS] CID parsed successfully, version:', cid.version);

    // Set a timeout for Helia download (10 seconds - reduced from 30)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Helia download timeout')), 10000)
    );

    const data = await Promise.race([
      jsonHandler.get(cid),
      timeoutPromise
    ]);

    console.log('✅ [downloadFromIPFS] Successfully downloaded via Helia P2P!');
    console.log('[downloadFromIPFS] Downloaded data type:', typeof data);
    console.log('[downloadFromIPFS] Downloaded data:', data);

    // Cache the downloaded data
    try {
      const cacheKey = `ipfs_cache_${cidString}`;
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log('[downloadFromIPFS] 💾 Data cached in localStorage');
    } catch (error) {
      console.warn('[downloadFromIPFS] Failed to cache data:', error);
    }

    return data as T;
  } catch (heliaError) {
    console.warn('⚠️ [downloadFromIPFS] Helia P2P download failed:', heliaError);
    console.log('[downloadFromIPFS] Falling back to HTTP gateways...');

    // Fallback to HTTP gateways
    const gateways = [
      `https://ipfs.io/ipfs/${cidString}`,
      `https://gateway.ipfs.io/ipfs/${cidString}`,
      `https://cloudflare-ipfs.com/ipfs/${cidString}`,
      `https://dweb.link/ipfs/${cidString}`,
    ];

    let lastError: Error | null = null;

    for (let i = 0; i < gateways.length; i++) {
      const gatewayUrl = gateways[i];
      try {
        console.log(`[downloadFromIPFS] Method ${i + 2}: Trying gateway ${i + 1}/${gateways.length}...`);
        console.log(`[downloadFromIPFS] Gateway URL: ${gatewayUrl}`);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
          const response = await fetch(gatewayUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log(`[downloadFromIPFS] Gateway response status: ${response.status}`);

          if (!response.ok) {
            throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`✅ [downloadFromIPFS] Successfully downloaded via gateway!`);
          console.log(`[downloadFromIPFS] Gateway used: ${gatewayUrl}`);
          console.log('[downloadFromIPFS] Downloaded data type:', typeof data);
          console.log('[downloadFromIPFS] Downloaded data:', data);

          // Cache the downloaded data for future access
          try {
            const cacheKey = `ipfs_cache_${cidString}`;
            localStorage.setItem(cacheKey, JSON.stringify(data));
            console.log('[downloadFromIPFS] 💾 Data cached in localStorage');
          } catch (error) {
            console.warn('[downloadFromIPFS] Failed to cache data:', error);
          }

          return data as T;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (gatewayError) {
        console.warn(`⚠️ [downloadFromIPFS] Gateway ${i + 1}/${gateways.length} failed:`, gatewayError);
        lastError = gatewayError instanceof Error ? gatewayError : new Error(String(gatewayError));
      }
    }

    // All attempts failed
    console.error('❌ [downloadFromIPFS] All download methods failed!');
    console.error('[downloadFromIPFS] CID:', cidString);
    console.error('[downloadFromIPFS] Last error:', lastError);

    throw new Error(
      `Failed to download from IPFS after trying all methods. ` +
      `CID: ${cidString}. ` +
      `Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Please ensure the content is pinned and available on the IPFS network.`
    );
  }
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
