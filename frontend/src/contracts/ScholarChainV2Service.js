import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers'

export const V2_CONTRACT_ADDRESS = '0xf5716dEbdEe3E5aADD1fB4975EA2dc65Ceb59479'
export const SEPOLIA_CHAIN_ID = '11155111'

// Reads use a public Sepolia RPC, so visitors do not need MetaMask.
const PUBLIC_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'

const abi = [
	'function owner() view returns (address)',
	'function getInstitution(address) view returns (tuple(string profileURI,uint8 status,uint256 appliedAt,uint256 approvedAt,uint256 updatedAt))',
	'function getInstitutionCount() view returns (uint256)',
	'function getInstitutionAt(uint256) view returns (address)',
	'function applyForInstitution(string profileURI)',
	'function updateInstitutionProfile(string profileURI)',
	'function approveInstitution(address institutionAddress)',
	'function rejectInstitution(address institutionAddress)',
	'function suspendInstitution(address institutionAddress)',
	'function reactivateInstitution(address institutionAddress)',
	'function mintCredential(address student,string credentialId,string achievementTitle,uint8 credentialType,string metadataURI) returns (uint256)',
	'function revokeCredential(uint256 tokenId)',
	'function getCredential(uint256 tokenId) view returns (tuple(string credentialId,string achievementTitle,address issuer,uint256 issuedAt,uint8 credentialType,bool revoked,address holder,string metadataURI))',
	'function getCredentialsOfHolder(address holder) view returns (uint256[])',
	'function getCredentialsOfInstitution(address institution) view returns (uint256[])',
	'function totalCredentialsIssued() view returns (uint256)',
	'function isCredentialValid(uint256 tokenId) view returns (bool)',
	'event CredentialMinted(address indexed student,address indexed institution,uint256 indexed tokenId,string credentialId,string achievementTitle,uint8 credentialType,string metadataURI)',
]

// ─── Contract Error Decoder ─────────────────────────────────────────────────
// Maps 4-byte Solidity custom error selectors to human-readable messages.
const KNOWN_ERRORS = {
	'0xbc1e7554': 'Credential does not exist. Check that the Token ID was minted.',
	'0x82b42900': 'Unauthorized — your wallet is not an approved institution.',
	'0x6697b232': 'Institution is not registered or not approved.',
	'0x7b5c6f47': 'Credential has already been revoked.',
	'0x461bcd88': 'Only the contract owner (admin) can call this function.',
}

export function decodeContractError(err) {
	// Try to extract the 4-byte selector from raw revert data
	const raw = err?.data ?? err?.error?.data ?? err?.info?.error?.data ?? ''
	if (typeof raw === 'string' && raw.length >= 10) {
		const selector = raw.slice(0, 10).toLowerCase()
		if (KNOWN_ERRORS[selector]) return KNOWN_ERRORS[selector]
	}
	// Fall back to the message, stripping raw hex noise
	const msg = err?.reason || err?.shortMessage || err?.message || 'Unknown error'
	if (msg.includes('0xbc1e7554')) return KNOWN_ERRORS['0xbc1e7554']
	if (msg.includes('0x82b42900')) return KNOWN_ERRORS['0x82b42900']
	if (msg.includes('execution reverted') && msg.includes('unknown custom error')) {
		return 'Contract rejected the request. Ensure your wallet is an approved institution and that the Token ID exists.'
	}
	// Strip verbose ethers boilerplate
	return msg.replace(/\s*\(action=.*$/s, '').trim() || 'Transaction failed'
}

// ─── Metadata Builder ────────────────────────────────────────────────────────
/**
 * Builds a credential metadata JSON object and returns it as a
 * base64-encoded data URI.  This lets institutions mint immediately
 * without needing a separate Pinata upload during a demo.
 *
 * @param {object} meta
 * @param {string} meta.institutionName
 * @param {string} meta.credentialTitle   – achievement title
 * @param {string} meta.credentialId      – serial number
 * @param {string} meta.credentialType    – label, e.g. "Academic"
 * @param {string} meta.studentAddress    – recipient 0x address
 * @param {string} meta.issueDate         – ISO date string
 * @param {string} [meta.duration]        – e.g. "4 years"
 * @param {string} [meta.description]
 * @param {string} [meta.logoUri]         – ipfs:// or https:// logo
 * @param {string} [meta.imageUri]        – certificate image URI
 * @returns {string} A data:application/json;base64,… URI
 */
export function buildCredentialMetadataURI(meta) {
	const json = {
		name: meta.credentialTitle,
		description: meta.description || `${meta.credentialTitle} awarded by ${meta.institutionName}`,
		image: meta.imageUri || '',
		external_url: '',
		attributes: [
			{ trait_type: 'Institution', value: meta.institutionName },
			{ trait_type: 'Credential ID', value: meta.credentialId },
			{ trait_type: 'Credential Type', value: meta.credentialType },
			{ trait_type: 'Issue Date', value: meta.issueDate },
			...(meta.duration ? [{ trait_type: 'Duration', value: meta.duration }] : []),
			{ trait_type: 'Recipient', value: meta.studentAddress },
		],
		institution: meta.institutionName,
		logo: meta.logoUri || '',
		issueDate: meta.issueDate,
		credentialId: meta.credentialId,
		credentialType: meta.credentialType,
		recipient: meta.studentAddress,
	}
	const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2))))
	return `data:application/json;base64,${encoded}`
}

export const INSTITUTION_STATUS = {
	NONE: 0,
	PENDING: 1,
	APPROVED: 2,
	REJECTED: 3,
	SUSPENDED: 4,
}

export const INSTITUTION_STATUS_LABELS = ['Not registered', 'Pending review', 'Approved', 'Rejected', 'Suspended']
const CREDENTIAL_TYPE_LABELS = ['Academic', 'Internship', 'Workshop', 'Competition', 'Volunteer', 'Research']

function publicContract() {
	return new Contract(V2_CONTRACT_ADDRESS, abi, new JsonRpcProvider(PUBLIC_SEPOLIA_RPC))
}

async function signerContract() {
	if (!window.ethereum) throw new Error('Install MetaMask to sign this transaction.')
	const provider = new BrowserProvider(window.ethereum)
	const network = await provider.getNetwork()
	if (network.chainId.toString() !== SEPOLIA_CHAIN_ID) {
		throw new Error('Switch MetaMask to the Sepolia test network first.')
	}
	const signer = await provider.getSigner()
	return new Contract(V2_CONTRACT_ADDRESS, abi, signer)
}

export function resolveIpfsUrl(uri) {
	if (!uri) return ''
	if (uri.startsWith('ipfs://')) {
		const cid = uri.slice(7)
		return `https://ipfs.io/ipfs/${cid}`
	}
	return uri
}

const profileCache = new Map()

export async function fetchV2Metadata(uri) {
	if (!uri) return null

	// Handle inline data URIs (auto-generated by buildCredentialMetadataURI)
	if (uri.startsWith('data:application/json')) {
		try {
			const commaIdx = uri.indexOf(',')
			if (commaIdx !== -1) {
				const payload = uri.slice(commaIdx + 1)
				const isBase64 = uri.slice(0, commaIdx).includes('base64')
				const jsonStr = isBase64
					? decodeURIComponent(escape(atob(payload)))
					: decodeURIComponent(payload)
				return JSON.parse(jsonStr)
			}
		} catch {
			return null
		}
	}

	const url = resolveIpfsUrl(uri)
	try {
		const response = await fetch(url)
		if (response.ok) return await response.json()
	} catch {
		// Fallback to public Pinata gateway if ipfs.io is throttled
		if (uri.startsWith('ipfs://')) {
			const fallbackUrl = `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`
			try {
				const fbResp = await fetch(fallbackUrl)
				if (fbResp.ok) return await fbResp.json()
			} catch {
				// Both gateways failed
			}
		}
	}
	// Return null instead of throwing so cards still render without metadata
	return null
}

export async function resolveInstitutionProfile(address, bypassCache = false) {
	if (!address || address === '0x0000000000000000000000000000000000000000') return null
	const key = address.toLowerCase()
	if (!bypassCache && profileCache.has(key)) return profileCache.get(key)

	try {
		const inst = await getV2Institution(address)
		let profileMeta = null
		if (inst.profileURI) {
			try {
				profileMeta = await fetchV2Metadata(inst.profileURI)
			} catch {
				profileMeta = null
			}
		}
		const resolved = {
			address,
			status: inst.status,
			profileURI: inst.profileURI,
			appliedAt: inst.appliedAt,
			approvedAt: inst.approvedAt,
			updatedAt: inst.updatedAt,
			name: profileMeta?.name || `Institution (${address.slice(0, 6)}...${address.slice(-4)})`,
			type: profileMeta?.type || 'Institution',
			logo: profileMeta?.logo ? resolveIpfsUrl(profileMeta.logo) : '',
			website: profileMeta?.website || '',
			officialEmail: profileMeta?.officialEmail || '',
			country: profileMeta?.country || '',
			description: profileMeta?.description || '',
		}
		profileCache.set(key, resolved)
		return resolved
	} catch {
		return null
	}
}

export async function getV2Owner() {
	return publicContract().owner()
}

export async function getV2Institution(address) {
	const institution = await publicContract().getInstitution(address)
	return {
		profileURI: institution.profileURI,
		status: Number(institution.status),
		appliedAt: Number(institution.appliedAt),
		approvedAt: Number(institution.approvedAt),
		updatedAt: Number(institution.updatedAt),
	}
}

export async function getV2Institutions() {
	const contract = publicContract()
	const count = Number(await contract.getInstitutionCount())
	return Promise.all(
		Array.from({ length: count }, async (_, index) => {
			const address = await contract.getInstitutionAt(index)
			const inst = await getV2Institution(address)
			let profile = null
			if (inst.profileURI) {
				try {
					profile = await fetchV2Metadata(inst.profileURI)
				} catch {
					profile = null
				}
			}
			return { address, ...inst, profile }
		}),
	)
}

export async function applyForV2Institution(profileURI) {
	const tx = await (await signerContract()).applyForInstitution(profileURI)
	return tx.wait()
}

export async function updateV2InstitutionProfile(profileURI) {
	const tx = await (await signerContract()).updateInstitutionProfile(profileURI)
	return tx.wait()
}

export async function approveV2Institution(address) {
	const tx = await (await signerContract()).approveInstitution(address)
	return tx.wait()
}

export async function rejectV2Institution(address) {
	const tx = await (await signerContract()).rejectInstitution(address)
	return tx.wait()
}

export async function suspendV2Institution(address) {
	const tx = await (await signerContract()).suspendInstitution(address)
	return tx.wait()
}

export async function reactivateV2Institution(address) {
	const tx = await (await signerContract()).reactivateInstitution(address)
	return tx.wait()
}

export async function mintV2Credential(values) {
	const tx = await (await signerContract()).mintCredential(
		values.student,
		values.credentialId,
		values.achievementTitle,
		values.credentialType,
		values.metadataURI,
	)
	const receipt = await tx.wait()
	return { hash: tx.hash, receipt }
}

export async function revokeV2Credential(tokenId) {
	const tx = await (await signerContract()).revokeCredential(tokenId)
	return tx.wait()
}

export async function getTotalV2CredentialsIssued() {
	const total = await publicContract().totalCredentialsIssued()
	return Number(total.toString())
}

export async function isV2CredentialValid(tokenId) {
	return publicContract().isCredentialValid(tokenId)
}

async function formatCredential(tokenId, credential) {
	const issuedAt = Number(credential.issuedAt)
	const instProfile = await resolveInstitutionProfile(credential.issuer)
	return {
		tokenId: tokenId.toString(),
		credentialId: credential.credentialId,
		achievementTitle: credential.achievementTitle,
		issuer: credential.issuer,
		issuerName: instProfile?.name || `${credential.issuer.slice(0, 6)}...${credential.issuer.slice(-4)}`,
		issuerLogo: instProfile?.logo || '',
		issuerWebsite: instProfile?.website || '',
		issuerProfile: instProfile,
		issuedAt,
		issueDate: issuedAt ? new Date(issuedAt * 1000).toLocaleString() : 'N/A',
		credentialType: Number(credential.credentialType),
		credentialTypeLabel: CREDENTIAL_TYPE_LABELS[Number(credential.credentialType)] ?? 'Unknown',
		revoked: Boolean(credential.revoked),
		holder: credential.holder,
		metadataURI: credential.metadataURI,
	}
}

export async function getV2Credential(tokenId) {
	const cred = await publicContract().getCredential(tokenId)
	return formatCredential(tokenId, cred)
}

export async function getV2CredentialsOfHolder(address) {
	const contract = publicContract()
	const tokenIds = await contract.getCredentialsOfHolder(address)
	return Promise.all(tokenIds.map((tokenId) => getV2Credential(tokenId)))
}

export async function getV2CredentialsOfInstitution(address) {
	const contract = publicContract()
	const tokenIds = await contract.getCredentialsOfInstitution(address)
	return Promise.all(tokenIds.map((tokenId) => getV2Credential(tokenId)))
}

export async function switchToSepoliaNetwork() {
	if (!window.ethereum) throw new Error('MetaMask is not installed.')
	try {
		await window.ethereum.request({
			method: 'wallet_switchEthereumChain',
			params: [{ chainId: '0x' + Number(SEPOLIA_CHAIN_ID).toString(16) }],
		})
	} catch (switchError) {
		if (switchError.code === 4902) {
			await window.ethereum.request({
				method: 'wallet_addEthereumChain',
				params: [
					{
						chainId: '0x' + Number(SEPOLIA_CHAIN_ID).toString(16),
						chainName: 'Sepolia Test Network',
						nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
						rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
						blockExplorerUrls: ['https://sepolia.etherscan.io'],
					},
				],
			})
		} else {
			throw switchError
		}
	}
}

