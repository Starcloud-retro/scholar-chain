# ScholarChain V2: safe deployment guide

V1 remains deployed and unchanged. Deploy V2 only after reviewing and testing the new contract.

## 1. Prepare an institution profile on IPFS

Upload a JSON file such as this to Pinata:

```json
{
  "name": "Example University",
  "type": "University",
  "website": "https://example.edu",
  "officialEmail": "credentials@example.edu",
  "country": "India",
  "description": "An approved credential issuer on ScholarChain.",
  "logo": "ipfs://YOUR_LOGO_CID",
  "accreditationProof": "https://example.edu/accreditation"
}
```

Copy the resulting CID as `ipfs://YOUR_PROFILE_CID`.

## 2. Compile and deploy in Remix

1. Open Remix IDE and create `ScholarChainV2.sol`.
2. Copy `contracts/ScholarChainV2.sol` from this repository into that file.
3. Compile with Solidity compiler **0.8.20** or a compatible later 0.8.x compiler.
4. In **Deploy & Run Transactions**, choose **Injected Provider - MetaMask**.
5. Select the **Sepolia** network in MetaMask. Never use mainnet while learning.
6. Deploy from the wallet that will be the ScholarChain administrator.
7. Copy the deployed contract address and the ABI from Remix.

The deployer is the administrator. It cannot mint until it first applies as an institution and then approves its own application, or it approves another institution wallet.

## 3. Test the full V2 lifecycle on Sepolia

Use separate wallets if possible:

1. Institution wallet calls `applyForInstitution(profileURI)`.
2. Admin wallet calls `approveInstitution(institutionWallet)`.
3. Confirm `getInstitution(institutionWallet)` reports `Approved` (enum value `2`).
4. Institution wallet calls `mintCredential(studentWallet, credentialId, title, credentialType, metadataURI)`.
5. Confirm `getCredential(tokenId)` and `getCredentialsOfHolder(studentWallet)`.
6. Admin wallet calls `revokeCredential(tokenId)` only on a deliberately created test credential.
7. Confirm `isCredentialValid(tokenId)` returns `false`.

Do not share a seed phrase, private key, or Pinata API secret. You approve all MetaMask transactions yourself.
