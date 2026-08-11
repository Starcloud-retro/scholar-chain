import {
	getIssuerOrganizationName,
	removeIssuerOrganization,
	setIssuerOrganization,
} from '../data/issuerRegistry'

export function getIssuerOrganizationLabel(address) {
	return getIssuerOrganizationName(address)
}

export function setIssuerOrganizationLabel(address, label) {
	if (!address || !label) return

	setIssuerOrganization({
		walletAddress: address,
		organizationName: label,
		website: '',
	})
}

export function removeIssuerOrganizationLabel(address) {
	removeIssuerOrganization(address)
}
