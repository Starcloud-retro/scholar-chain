# ScholarChain

> **Decentralized Credential Management & Public Verification System**

ScholarChain is a blockchain-first credential verification platform that empowers educational institutions to issue tamper-proof, non-transferable digital credentials (Soulbound Tokens) directly on the Ethereum Sepolia Testnet.

---

## 🌐 Live Links

- **Live Application:** [scholarchain-credential-system.vercel.app](https://scholarchain-credential-system.vercel.app/)
- **GitHub Repository:** [github.com/Starcloud-retro/scholarchain-credential-system](https://github.com/Starcloud-retro/scholarchain-credential-system)
- **Active Smart Contract (Sepolia):** [`0xf5716dEbdEe3E5aADD1fB4975EA2dc65Ceb59479`](https://sepolia.etherscan.io/address/0xf5716dEbdEe3E5aADD1fB4975EA2dc65Ceb59479)

---

## 💡 System Architecture & Technical Flow

```text
 ┌────────────────────────────────┐       ┌─────────────────────────────────┐
 │   Institution / University     │       │   Student / Recipient Wallet    │
 │ (0x74E2...794d - On-Chain Appr)│       │ (0x8D66...cD6A - Soulbound NFT) │
 └──────────────┬─────────────────┘       └────────────────┬────────────────┘
                │                                          │
                │ 1. Fills Credential Form & Uploads Art   │ 4. Views Soulbound
                ▼                                          │    Credential Vault
 ┌────────────────────────────────┐                        │
 │  Metadata JSON Builder / IPFS  │                        │
 │ (base64 Data URI or Pinata CID)│                        │
 └──────────────┬─────────────────┘                        │
                │ 2. Passes metadataURI                    │
                ▼                                          ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                  Ethereum Sepolia Smart Contract                         │
 │               (ScholarChainV2.sol @ 0xf571...9479)                       │
 │  • Enforces non-transferable (soulbound) _update logic                   │
 │  • Validates caller status == InstitutionStatus.Approved                 │
 │  • Emits CredentialMinted & logs immutable token audit trail             │
 └──────────────┬───────────────────────────────────────────────────────────┘
                │ 3. Query Token ID / Student Address
                ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                       Public Verification Engine                         │
 │   (Zero-gas read nodes via Ethers.js JsonRpcProvider - No wallet needed) │
 └───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 How ScholarChain Was Built From Scratch

### 1. Smart Contract Architecture (`ScholarChainV2.sol`)
Built with Solidity `^0.8.20` using OpenZeppelin v5 contracts (`ERC721URIStorage`, `Ownable`).

- **Soulbound Token Enforcement**: Standard ERC-721 tokens can be traded or sold. ScholarChain overrides the internal `_update(address to, uint256 tokenId, address auth)` hook:
  ```solidity
  function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
      address previousOwner = super._update(to, tokenId, auth);
      if (previousOwner != address(0) && to != address(0)) revert TransferNotAllowed();
      return previousOwner;
  }
  ```
  This guarantees credentials can **only be minted to the student once** and cannot be transferred or sold.

- **Institution Governance Lifecycle**:
  - `applyForInstitution(profileURI)`: Institutions register their profile CID/URI, setting status to `Pending` (`1`).
  - `approveInstitution(address)`: Contract Owner approves the applicant, setting status to `Approved` (`2`).
  - `mintCredential(...)`: Requires `institutions[msg.sender].status == InstitutionStatus.Approved`. Unauthorized callers trigger custom error `UnauthorizedInstitution()`.
  - `revokeCredential(tokenId)`: Contract owner can revoke fraudulent/disputed credentials directly on-chain.

### 2. IPFS & Data-URI Metadata Integration
- Metadata follows standard OpenSea/ERC-721 schemas (`name`, `description`, `image`, `attributes`).
- **Hybrid Storage Model**: Supports both raw IPFS CIDs (`ipfs://bafk...`) and on-the-fly `data:application/json;base64,...` URIs so institutions can issue credentials instantly in 1 click without requiring third-party API keys during a demo.

### 3. Frontend & Ethers.js V6 Integration
- Built with React, Vite, React Router, and Tailwind CSS.
- Uses `JsonRpcProvider` for zero-gas public verification (visitors can verify credentials without connecting MetaMask).
- Uses `BrowserProvider` and `getSigner()` for authenticated contract writes (issuance, applications, admin approvals).

---

## 🛠️ Project Structure

```text
scholarchain/
├── contracts/
│   └── ScholarChainV2.sol         # Core Sepolia Smart Contract
├── docs/
│   └── V2_DEPLOYMENT_GUIDE.md     # Deployment & verification notes
├── json/
│   ├── sample_credential.json     # Credential metadata JSON format
│   └── sample_institution.json    # Institution profile metadata format
├── frontend/
│   ├── frontend/                  # React Application Root
│   │   ├── src/
│   │   │   ├── components/        # Navbar, CredentialCard, WalletConnect
│   │   │   ├── contracts/         # ScholarChainV2Service.js (Ethers.js layer)
│   │   │   ├── pages/             # Home, Verify, MyCredentials, IssueCredential, Admin
│   │   │   ├── App.jsx            # Dynamic role detection & routing
│   │   │   └── main.jsx
│   │   ├── package.json
│   │   └── vite.config.js
└── README.md
```

---

## 🚀 How to Clone and Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MetaMask Browser Extension

### 1. Clone the Repository
```bash
git clone https://github.com/Starcloud-retro/scholarchain-credential-system.git
cd scholarchain-credential-system
```

### 2. Install Dependencies
```bash
cd frontend/frontend
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🧪 How to Demo the 3 Roles

### Demo Wallets Reference
- **🛡️ Governance Admin Wallet:** `0x52dEc6d91876e874E20b8DA50ea93FADEB277a3c`
- **🏛️ Approved Institution Wallet:** `0x74E2FbaCb00d4488C36131Cf4372a43F6bE6794d`
- **🎓 Student / Viewer Wallet:** `0x8D665e3D77bcA5141E04a2E0324E53b9Cb91cD6A`

### Testing Workflow
1. **Public Verification (No Wallet Needed)**
   - Go to [Verify](http://localhost:5173/verify) page.
   - Enter Token ID (e.g., `1`) or paste student wallet `0x8D665e3D77bcA5141E04a2E0324E53b9Cb91cD6A` to search credentials publicly.

2. **Issue a Credential (as Approved Institution)**
   - Switch MetaMask to wallet `0x74E2FbaCb00d4488C36131Cf4372a43F6bE6794d`.
   - The site automatically recognizes your account as an **Approved Institution** and shows the **Issue Credential** menu.
   - Go to **Issue Credential** page -> click **⚡ Fill Demo Values** -> click **🎓 Issue Credential**.

3. **View Credentials (as Student)**
   - Switch MetaMask to wallet `0x8D665e3D77bcA5141E04a2E0324E53b9Cb91cD6A`.
   - Go to **My Credentials** -> the newly issued credential appears in your personal vault.

4. **Govern & Approve Institutions (as Admin)**
   - Switch MetaMask to wallet `0x52dEc6d91876e874E20b8DA50ea93FADEB277a3c`.
   - Go to **Admin** page to review onboarding applications, manage institutions, or exercise credential revocation.

---

## 📤 How to Push Changes to GitHub

To push all your latest commits and updates to GitHub:

```bash
# 1. Check your changed files
git status

# 2. Stage all modified and new files
git add .

# 3. Commit your changes with a descriptive message
git commit -m "feat: complete V2 smart contract integration, metadata builder, role governance, and polished UI"

# 4. Push to your active branch (e.g., codex/v2-scholar-chain)
git push origin codex/v2-scholar-chain

# 5. (Optional) If pushing to main branch:
git push origin codex/v2-scholar-chain:main
```

---

## 👥 Team — Nexus Credential Systems

- **Jalaneela Sai Sandeep** (24R11A6622)
- **Jamulapuram Dhanush Narayana** (24R11A6623)
- **Kampelli Suhan Ramesh** (24R11A6628)
- **Adusumilli Rohit Kumar** (24R11A6652)
- **Banoth Ganesh** (24R11A6657)
- **Shaik Zaheer Abbas** (24R11A6690)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE.txt).
