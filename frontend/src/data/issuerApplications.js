const STORAGE_KEY = 'scholarchain.issuerApplications'

export const APPLICATION_STATUS = {
	PENDING: 'Pending',
	APPROVED: 'Approved',
	REJECTED: 'Rejected',
}

function normalizeAddress(address) {
	return (address || '').trim().toLowerCase()
}

function readApplications() {
	if (typeof window === 'undefined') return []

	try {
		const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

function writeApplications(applications) {
	if (typeof window === 'undefined') return

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
}

export function getIssuerApplications() {
	return readApplications()
}

export function getPendingIssuerApplications() {
	return readApplications().filter((application) => application.status === APPLICATION_STATUS.PENDING)
}

export function saveIssuerApplication(application) {
	const applications = readApplications()
	const walletKey = normalizeAddress(application.walletAddress)
	const nextApplication = {
		organizationName: application.organizationName.trim(),
		organizationType: application.organizationType,
		website: application.website.trim(),
		email: application.email.trim(),
		walletAddress: application.walletAddress.trim(),
		reason: application.reason.trim(),
		status: APPLICATION_STATUS.PENDING,
	}

	const existingIndex = applications.findIndex(
		(item) => normalizeAddress(item.walletAddress) === walletKey,
	)

	if (existingIndex >= 0) {
		applications[existingIndex] = nextApplication
	} else {
		applications.push(nextApplication)
	}

	writeApplications(applications)
	return nextApplication
}

export function updateIssuerApplicationStatus(walletAddress, status) {
	const walletKey = normalizeAddress(walletAddress)
	const applications = readApplications().map((application) => {
		if (normalizeAddress(application.walletAddress) !== walletKey) return application
		return {
			...application,
			status,
		}
	})

	writeApplications(applications)
	return applications
}
