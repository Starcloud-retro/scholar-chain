const STORAGE_KEY = 'scholarchain.issuerRegistry'

function normalizeAddress(address) {
	return (address || '').trim().toLowerCase()
}

function readRegistryMap() {
	if (typeof window === 'undefined') return {}

	try {
		return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
	} catch {
		return {}
	}
}

function writeRegistryMap(registry) {
	if (typeof window === 'undefined') return

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry))
}

export function getIssuerRegistry() {
	return Object.values(readRegistryMap())
}

export function getIssuerOrganization(address) {
	const normalizedAddress = normalizeAddress(address)
	if (!normalizedAddress) return null

	return readRegistryMap()[normalizedAddress] || null
}

export function getIssuerOrganizationName(address) {
	return getIssuerOrganization(address)?.organizationName || ''
}

export function setIssuerOrganization({ walletAddress, organizationName, website = '' }) {
	const normalizedAddress = normalizeAddress(walletAddress)
	if (!normalizedAddress || !organizationName?.trim()) return

	const registry = readRegistryMap()
	registry[normalizedAddress] = {
		walletAddress: walletAddress.trim(),
		organizationName: organizationName.trim(),
		website: website.trim(),
	}
	writeRegistryMap(registry)
}

export function removeIssuerOrganization(address) {
	const normalizedAddress = normalizeAddress(address)
	if (!normalizedAddress) return

	const registry = readRegistryMap()
	delete registry[normalizedAddress]
	writeRegistryMap(registry)
}
