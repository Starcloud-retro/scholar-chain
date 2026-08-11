import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CredentialCard from '../components/CredentialCard'
import CredentialDetailsModal from '../components/CredentialDetailsModal'
import {
	fetchV2Metadata,
	getV2CredentialsOfInstitution,
	getV2Institution,
	INSTITUTION_STATUS_LABELS,
	resolveIpfsUrl,
	updateV2InstitutionProfile,
} from '../contracts/ScholarChainV2Service'

function shortenAddress(address) {
	if (!address) return ''
	return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function AdminDashboard({ walletState }) {
	const { account, isAuthorizedIssuerRole, isContractOwner, institutionProfile } = walletState

	const [institutionData, setInstitutionData] = useState(null)
	const [profileMeta, setProfileMeta] = useState(null)
	const [issuedCredentials, setIssuedCredentials] = useState([])
	const [newProfileURI, setNewProfileURI] = useState('')
	const [loading, setLoading] = useState(false)
	const [updatingProfile, setUpdatingProfile] = useState(false)
	const [selectedCredential, setSelectedCredential] = useState(null)
	const [error, setError] = useState('')
	const [successMsg, setSuccessMsg] = useState('')

	const loadDashboardData = useCallback(async () => {
		if (!account) return
		setLoading(true)
		setError('')
		try {
			const [inst, creds] = await Promise.all([
				getV2Institution(account),
				getV2CredentialsOfInstitution(account),
			])

			setInstitutionData(inst)
			if (inst.profileURI) {
				setNewProfileURI(inst.profileURI)
				try {
					const meta = await fetchV2Metadata(inst.profileURI)
					setProfileMeta(meta)
				} catch {
					setProfileMeta(null)
				}
			}

			// Parse IPFS metadata for credentials
			const enrichedCreds = await Promise.all(
				creds.map(async (c) => {
					try {
						const metadata = await fetchV2Metadata(c.metadataURI)
						return { ...c, metadata }
					} catch {
						return { ...c, metadata: null }
					}
				}),
			)
			setIssuedCredentials(enrichedCreds)
		} catch (err) {
			setError(err.message || 'Failed to load institution data.')
		} finally {
			setLoading(false)
		}
	}, [account])

	useEffect(() => {
		let mounted = true
		if (account) {
			Promise.resolve().then(() => {
				if (mounted) loadDashboardData()
			})
		}
		return () => {
			mounted = false
		}
	}, [account, loadDashboardData])

	const handleUpdateProfile = async (e) => {
		e.preventDefault()
		setError('')
		setSuccessMsg('')
		if (!newProfileURI.trim().startsWith('ipfs://')) {
			setError('Please enter a valid IPFS URI starting with ipfs://')
			return
		}

		setUpdatingProfile(true)
		try {
			await fetchV2Metadata(newProfileURI.trim())
			await updateV2InstitutionProfile(newProfileURI.trim())
			setSuccessMsg('Institution profile updated on Sepolia!')
			await loadDashboardData()
		} catch (err) {
			setError(err.message || 'Failed to update institution profile.')
		} finally {
			setUpdatingProfile(false)
		}
	}

	const stats = useMemo(() => {
		const total = issuedCredentials.length
		const active = issuedCredentials.filter((c) => !c.revoked).length
		const revoked = total - active
		return { total, active, revoked }
	}, [issuedCredentials])

	if (!account) {
		return (
			<section className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[#0F172A]/80 p-8 text-center backdrop-blur-xl shadow-2xl">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
					🏛️
				</div>
				<h1 className="mt-4 font-serif text-2xl font-bold text-white">Institution Dashboard</h1>
				<p className="mt-2 text-sm text-slate-300">
					Connect an approved institution wallet from the navigation header to view your operational portal.
				</p>
			</section>
		)
	}

	if (!isAuthorizedIssuerRole && !isContractOwner) {
		return (
			<section className="mx-auto max-w-3xl rounded-3xl border border-amber-500/30 bg-slate-900/90 p-8 text-center shadow-2xl">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-3xl">
					⚠️
				</div>
				<h1 className="mt-4 font-serif text-2xl font-bold text-white">Authorization Required</h1>
				<p className="mt-2 text-sm text-slate-300">
					The connected wallet <span className="font-mono text-amber-300 font-semibold">{shortenAddress(account)}</span> is not currently an approved institution on Sepolia.
				</p>
				<div className="mt-6 flex justify-center gap-4">
					<Link
						to="/issuer-application"
						className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/25"
					>
						Apply as Institution
					</Link>
				</div>
			</section>
		)
	}

	const displayLogo = profileMeta?.logo ? resolveIpfsUrl(profileMeta.logo) : ''
	const displayName = profileMeta?.name || institutionProfile?.name || 'Approved Institution'

	return (
		<section className="mx-auto max-w-7xl space-y-8">
			{/* Header card */}
			<div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-[#0F172A] via-slate-950 to-[#0B0F17] p-6 sm:p-8 shadow-2xl">
				<div className="flex flex-wrap items-center justify-between gap-6">
					<div className="flex items-center gap-5">
						<div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-900 shadow-inner overflow-hidden">
							{displayLogo ? (
								<img src={displayLogo} alt={displayName} className="h-full w-full object-cover" />
							) : (
								<span className="text-3xl">🏛️</span>
							)}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
									{INSTITUTION_STATUS_LABELS[institutionData?.status] || 'Approved Issuer'}
								</span>
								<span className="font-mono text-xs text-slate-400">{shortenAddress(account)}</span>
							</div>
							<h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-white">{displayName}</h1>
							{profileMeta?.website ? (
								<a
									href={profileMeta.website}
									target="_blank"
									rel="noreferrer"
									className="mt-1 inline-block text-xs text-amber-400 hover:underline font-medium"
								>
									🌐 {profileMeta.website}
								</a>
							) : null}
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<Link
							to="/issue"
							className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110"
						>
							+ Mint New Credential
						</Link>
						<button
							type="button"
							onClick={loadDashboardData}
							disabled={loading}
							className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
						>
							{loading ? 'Refreshing...' : '🔄 Refresh Data'}
						</button>
					</div>
				</div>
			</div>

			{error ? (
				<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200 font-medium">
					⚠️ {error}
				</div>
			) : null}

			{successMsg ? (
				<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 font-medium">
					✓ {successMsg}
				</div>
			) : null}

			{/* Operational metrics */}
			<div className="grid gap-4 sm:grid-cols-3">
				<article className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
					<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Credentials Minted</p>
					<p className="mt-3 font-serif text-3xl font-bold text-white">{loading ? '...' : stats.total}</p>
				</article>
				<article className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-xl backdrop-blur-md">
					<p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Active Verified Records</p>
					<p className="mt-3 font-serif text-3xl font-bold text-emerald-200">{loading ? '...' : stats.active}</p>
				</article>
				<article className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-xl backdrop-blur-md">
					<p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Revoked Records</p>
					<p className="mt-3 font-serif text-3xl font-bold text-rose-200">{loading ? '...' : stats.revoked}</p>
				</article>
			</div>

			{/* Institution profile update form */}
			<form onSubmit={handleUpdateProfile} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-8 space-y-4 backdrop-blur-xl">
				<div>
					<h2 className="font-serif text-lg font-bold text-white">Update Institution Profile URI</h2>
					<p className="mt-1 text-xs text-slate-300">
						Update your organization profile metadata on Sepolia. Create a JSON on Pinata and paste its full <span className="font-mono text-amber-300">ipfs://...</span> URI below.
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3">
					<input
						value={newProfileURI}
						onChange={(e) => setNewProfileURI(e.target.value)}
						placeholder="ipfs://bafk..."
						className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
						disabled={updatingProfile}
					/>
					<button
						type="submit"
						disabled={updatingProfile}
						className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-6 py-3 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-60"
					>
						{updatingProfile ? 'Updating On-Chain...' : 'Update On Sepolia'}
					</button>
				</div>
			</form>

			{/* Credentials list */}
			<div className="space-y-4">
				<div>
					<h2 className="font-serif text-xl font-bold text-white">Credentials Issued By Your Institution</h2>
					<p className="mt-1 text-xs text-slate-300">
						Permanent blockchain audit log of all credentials minted under wallet <span className="font-mono text-slate-300">{account}</span>.
					</p>
				</div>

				{issuedCredentials.length === 0 && !loading ? (
					<div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-slate-300">
						No credentials issued yet. Click "+ Mint New Credential" to create your institution's first academic credential on Sepolia.
					</div>
				) : (
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{issuedCredentials.map((c) => (
							<CredentialCard key={c.tokenId} credential={c} onOpen={setSelectedCredential} />
						))}
					</div>
				)}
			</div>

			{selectedCredential ? (
				<CredentialDetailsModal credential={selectedCredential} onClose={() => setSelectedCredential(null)} />
			) : null}
		</section>
	)
}
