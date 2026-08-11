import { BrowserProvider, Contract } from 'ethers'
import abi from './abi.json'
import { CONTRACT_ADDRESS } from './config'
import { CREDENTIAL_TYPE_LABELS } from './credentialTypes'

function resolveMetadataUrl(metadataURI) {
	if (!metadataURI) return ''

	if (metadataURI.startsWith('ipfs://')) {
		return `https://ipfs.io/ipfs/${metadataURI.replace('ipfs://', '')}`
	}

	return metadataURI
}

export async function fetchCredentialMetadata(metadataURI) {
	if (!metadataURI) return null

	const metadataUrl = resolveMetadataUrl(metadataURI)
	const response = await fetch(metadataUrl)

	if (!response.ok) {
		throw new Error('Unable to load credential metadata from IPFS.')
	}

	return response.json()
}

function assertEthereum() {
	if (!window.ethereum) {
		throw new Error('Please connect wallet.')
	}
}

async function getBrowserProvider() {
	assertEthereum()

	const provider = new BrowserProvider(window.ethereum)
	const accounts = await provider.send('eth_accounts', [])

	if (!accounts.length) {
		throw new Error('Please connect wallet.')
	}

	return provider
}

export async function connectWallet() {
	assertEthereum()

	const provider = new BrowserProvider(window.ethereum)
	const accounts = await provider.send('eth_requestAccounts', [])
	const network = await provider.getNetwork()

	if (!accounts.length) {
		throw new Error('No wallet account found.')
	}

	return {
		account: accounts[0],
		chainId: network.chainId.toString(),
	}
}

export async function switchAccountPermissions() {
	assertEthereum()

	const provider = new BrowserProvider(window.ethereum)
	await provider.send('wallet_requestPermissions', [{ eth_accounts: {} }])

	const accounts = await provider.send('eth_accounts', [])
	const network = await provider.getNetwork()

	if (!accounts.length) {
		return {
			account: '',
			chainId: network.chainId.toString(),
		}
	}

	return {
		account: accounts[0],
		chainId: network.chainId.toString(),
	}
}

export async function getContract(withSigner = false) {
	if (withSigner) {
		const provider = await getBrowserProvider()
		const runner = await provider.getSigner()
		return new Contract(CONTRACT_ADDRESS, abi, runner)
	}

	const provider = await getBrowserProvider()
	return new Contract(CONTRACT_ADDRESS, abi, provider)
}

export async function mintCredential({
	student,
	credentialId,
	achievementTitle,
	issuerName,
	credentialType,
	metadataURI,
}) {
	const contract = await getContract(true)

	const tx = await contract.mintCredential(
		student,
		credentialId,
		achievementTitle,
		issuerName,
		credentialType,
		metadataURI,
	)

	const receipt = await tx.wait()
	let tokenId = null

	if (receipt?.logs?.length) {
		for (const log of receipt.logs) {
			try {
				const parsed = contract.interface.parseLog(log)
				if (parsed?.name === 'CredentialMinted') {
					tokenId = parsed.args?.tokenId?.toString() || null
					break
				}
			} catch {
				// Ignore unrelated logs.
			}
		}
	}

	return {
		hash: tx.hash,
		tokenId,
		receipt,
	}
}

export async function getCredential(tokenId) {
	const contract = await getContract(false)
	const credential = await contract.getCredential(tokenId)

	const issuedAt = Number(credential.issuedAt)
	const typeId = Number(credential.credentialType)

	return {
		tokenId: tokenId.toString(),
		credentialId: credential.credentialId,
		achievementTitle: credential.achievementTitle,
		issuerName: credential.issuerName,
		holder: credential.holder,
		issuedAt,
		issueDate: issuedAt ? new Date(issuedAt * 1000).toLocaleString() : 'N/A',
		credentialType: typeId,
		credentialTypeLabel: CREDENTIAL_TYPE_LABELS[typeId] ?? `Type ${typeId}`,
		revoked: Boolean(credential.revoked),
		metadataURI: credential.metadataURI,
	}
}

export async function getOwner() {
	const contract = await getContract(false)
	const owner = await contract.owner()
	return owner
}

export async function isAuthorizedIssuer(address) {
	if (!address) return false

	const contract = await getContract(false)
	return contract.isAuthorizedIssuer(address)
}

export async function getAuthorizedIssuers() {
	const contract = await getContract(false)
	const count = Number((await contract.getAuthorizedIssuerCount()).toString())
	const issuers = []

	for (let index = 0; index < count; index += 1) {
		const issuer = await contract.getAuthorizedIssuerAt(index)
		issuers.push(issuer)
	}

	return issuers
}

export async function addAuthorizedIssuer(address) {
	const contract = await getContract(true)
	const tx = await contract.addAuthorizedIssuer(address)
	return tx.wait()
}

export async function removeAuthorizedIssuer(address) {
	const contract = await getContract(true)
	const tx = await contract.removeAuthorizedIssuer(address)
	return tx.wait()
}

export async function getTotalCredentialsIssued() {
	const contract = await getContract(false)
	const total = await contract.totalCredentialsIssued()
	return Number(total.toString())
}

export async function getTokensOfOwner(ownerAddress) {
	const contract = await getContract(false)

	const balanceBn = await contract.balanceOf(ownerAddress)
	const balance = Number(balanceBn?.toString?.() || 0)

	const totalBn = await contract.totalCredentialsIssued()
	const total = Number(totalBn?.toString?.() || 0)

	const found = []
	if (total <= 0) return found

	for (let id = 1; id <= total; id++) {
		try {
			const owner = await contract.ownerOf(id)
			if (!owner) continue
			if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
				found.push(id.toString())
				if (found.length >= balance) break
			}
		} catch {
			// skip non-existent tokenIds or other errors
			continue
		}
	}

	return found
}
