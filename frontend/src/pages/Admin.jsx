import { useEffect, useMemo, useState } from 'react'
import {
	approveV2Institution,
	fetchV2Metadata,
	getTotalV2CredentialsIssued,
	getV2Credential,
	getV2Institutions,
	INSTITUTION_STATUS,
	INSTITUTION_STATUS_LABELS,
	reactivateV2Institution,
	rejectV2Institution,
	resolveIpfsUrl,
	revokeV2Credential,
	suspendV2Institution,
} from '../contracts/ScholarChainV2Service'

function shortenAddress(address) {
	if (!address) return ''
	return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function Admin({ walletState }) {
	const { account, isContractOwner } = walletState
	const [institutions, setInstitutions] = useState([])
	const [totalIssuedCount, setTotalIssuedCount] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [successMsg, setSuccessMsg] = useState('')
	const [working, setWorking] = useState('')

	// Admin Revocation state
	const [revokeTokenId, setRevokeTokenId] = useState('')
	const [searchCredential, setSearchCredential] = useState(null)
	const [searchingCred, setSearchingCred] = useState(false)
	const [revokingCred, setRevokingCred] = useState(false)
	const [credError, setCredError] = useState('')

	const loadData = async () => {
		setLoading(true)
		setError('')
		try {
			const [onChain, totalCount] = await Promise.all([
				getV2Institutions(),
				getTotalV2CredentialsIssued().catch(() => 0),
			])
			setTotalIssuedCount(totalCount)

			const withProfiles = await Promise.all(
				onChain.map(async (item) => {
					let profile = null
					if (item.profileURI) {
						try {
							profile = await fetchV2Metadata(item.profileURI)
						} catch {
							profile = null
						}
					}
					return { ...item, profile }
				}),
			)
			setInstitutions(withProfiles)
		} catch (loadError) {
			setError(loadError.message || 'Unable to load institution applications.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		let mounted = true
		if (account && isContractOwner) {
			Promise.resolve().then(() => {
				if (mounted) loadData()
			})
		}
		return () => {
			mounted = false
		}
	}, [account, isContractOwner])

	const executeAction = async (address, actionFn, label) => {
		setWorking(address)
		setError('')
		setSuccessMsg('')
		try {
			await actionFn(address)
			setSuccessMsg(`Action "${label}" executed on Sepolia for ${shortenAddress(address)}!`)
			await loadData()
		} catch (actionError) {
			setError(actionError.message || 'Transaction failed.')
		} finally {
			setWorking('')
		}
	}

	const handleSearchCredential = async (e) => {
		e.preventDefault()
		setCredError('')
		setSearchCredential(null)
		if (!revokeTokenId.trim()) return

		setSearchingCred(true)
		try {
			const cred = await getV2Credential(revokeTokenId.trim())
			if (cred.metadataURI) {
				try {
					cred.metadata = await fetchV2Metadata(cred.metadataURI)
				} catch {
					cred.metadata = null
				}
			}
			setSearchCredential(cred)
		} catch (err) {
			setCredError(err.message || 'Credential ID not found on contract.')
		} finally {
			setSearchingCred(false)
		}
	}

	const handleRevokeCredential = async (tokenId) => {
		if (!window.confirm(`Are you sure you want to permanently REVOKE Credential Token #${tokenId} on Sepolia?`)) {
			return
		}
		setCredError('')
		setRevokingCred(true)
		try {
			await revokeV2Credential(tokenId)
			setSuccessMsg(`Credential Token #${tokenId} successfully revoked on-chain!`)
			// Refresh searched credential
			const updated = await getV2Credential(tokenId)
			setSearchCredential(updated)
			await loadData()
		} catch (err) {
			setCredError(err.message || 'Failed to revoke credential.')
		} finally {
			setRevokingCred(false)
		}
	}

	const stats = useMemo(() => {
		const total = institutions.length
		const pending = institutions.filter((i) => i.status === INSTITUTION_STATUS.PENDING).length
		const approved = institutions.filter((i) => i.status === INSTITUTION_STATUS.APPROVED).length
		const suspended = institutions.filter((i) => i.status === INSTITUTION_STATUS.SUSPENDED).length
		const rejected = institutions.filter((i) => i.status === INSTITUTION_STATUS.REJECTED).length
		return { total, pending, approved, suspended, rejected }
	}, [institutions])

	if (!account || !isContractOwner) {
		return (
			<section className="mx-auto max-w-3xl rounded-3xl border border-rose-500/30 bg-[#0F172A]/90 p-8 text-center shadow-2xl backdrop-blur-xl">
				<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-3xl">
					🛡️
				</div>
				<h1 className="mt-4 font-serif text-2xl font-bold text-white">Governance Admin Portal</h1>
				<p className="mt-2 text-xs text-rose-200">
					Connect the contract owner wallet (<span className="font-mono font-semibold">0x52dEc...7a3c</span>) on Sepolia to access governance controls.
				</p>
			</section>
		)
	}

	return (
		<section className="mx-auto max-w-7xl space-y-8">
			{/* Admin header */}
			<div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-[#0F172A] via-slate-950 to-[#0B0F17] p-6 sm:p-8 shadow-2xl">
				<div className="flex flex-wrap items-center justify-between gap-6">
					<div>
						<div className="flex items-center gap-2">
							<span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
								Contract Governance
							</span>
							<span className="font-mono text-xs text-slate-400">{shortenAddress(account)}</span>
						</div>
						<h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold text-white">ScholarChain Governance Portal</h1>
						<p className="mt-1 text-xs text-slate-300">
							Review on-chain institution onboarding applications, manage active issuers, and exercise system credential revocation.
						</p>
					</div>

					<button
						type="button"
						onClick={loadData}
						disabled={loading}
						className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
					>
						{loading ? 'Refreshing...' : '🔄 Refresh On-Chain State'}
					</button>
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

			{/* Governance stats */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl">
					<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Applications</p>
					<p className="mt-2 font-serif text-2xl font-bold text-white">{loading ? '...' : stats.total}</p>
				</article>
				<article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-xl">
					<p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Pending Review</p>
					<p className="mt-2 font-serif text-2xl font-bold text-amber-200">{loading ? '...' : stats.pending}</p>
				</article>
				<article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-xl">
					<p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Approved Institutions</p>
					<p className="mt-2 font-serif text-2xl font-bold text-emerald-200">{loading ? '...' : stats.approved}</p>
				</article>
				<article className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-xl">
					<p className="text-[10px] font-bold uppercase tracking-widest text-rose-300">Suspended</p>
					<p className="mt-2 font-serif text-2xl font-bold text-rose-200">{loading ? '...' : stats.suspended}</p>
				</article>
				<article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl">
					<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Credentials Issued</p>
					<p className="mt-2 font-serif text-2xl font-bold text-amber-300">{loading ? '...' : totalIssuedCount}</p>
				</article>
			</div>

			{/* Section 1: Pending Applications */}
			<div className="space-y-4">
				<div>
					<h2 className="font-serif text-xl font-bold text-white">Pending Institution Onboarding Applications</h2>
					<p className="mt-1 text-xs text-slate-300">Review IPFS profiles submitted on Sepolia and approve or reject minting authorization.</p>
				</div>

				{institutions.filter((i) => i.status === INSTITUTION_STATUS.PENDING).length === 0 && !loading ? (
					<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-slate-300">
						No pending institution applications at this time.
					</div>
				) : (
					<div className="grid gap-4 lg:grid-cols-2">
						{institutions
							.filter((i) => i.status === INSTITUTION_STATUS.PENDING)
							.map((item) => {
								const logoUrl = item.profile?.logo ? resolveIpfsUrl(item.profile.logo) : ''
								return (
									<article key={item.address} className="rounded-3xl border border-amber-500/30 bg-[#0F172A] p-6 space-y-4 shadow-xl">
										<div className="flex items-start justify-between gap-4">
											<div className="flex items-center gap-3">
												<div className="h-12 w-12 rounded-xl border border-amber-500/30 bg-slate-950 flex items-center justify-center overflow-hidden">
													{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xl">🏛️</span>}
												</div>
												<div>
													<h3 className="font-serif text-lg font-bold text-white">{item.profile?.name || 'Institution Applicant'}</h3>
													<p className="font-mono text-xs text-amber-300">{item.address}</p>
												</div>
											</div>
											<span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300">
												PENDING
											</span>
										</div>

										<div className="grid gap-2 text-xs border-t border-b border-white/10 py-3">
											{item.profile?.type ? <p className="text-slate-300"><strong className="text-slate-400">Type:</strong> {item.profile.type}</p> : null}
											{item.profile?.country ? <p className="text-slate-300"><strong className="text-slate-400">Country:</strong> {item.profile.country}</p> : null}
											{item.profile?.officialEmail ? <p className="text-slate-300"><strong className="text-slate-400">Email:</strong> {item.profile.officialEmail}</p> : null}
											{item.profile?.website ? (
												<a href={item.profile.website} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
													🌐 {item.profile.website}
												</a>
											) : null}
											<p className="font-mono text-[11px] text-slate-400 break-all"><strong className="text-slate-400">IPFS:</strong> {item.profileURI}</p>
										</div>

										<div className="flex gap-3">
											<button
												type="button"
												disabled={working === item.address}
												onClick={() => executeAction(item.address, approveV2Institution, 'Approve Institution')}
												className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60"
											>
												Approve Institution
											</button>
											<button
												type="button"
												disabled={working === item.address}
												onClick={() => executeAction(item.address, rejectV2Institution, 'Reject Application')}
												className="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-60"
											>
												Reject Application
											</button>
										</div>
									</article>
								)
							})}
					</div>
				)}
			</div>

			{/* Section 2: All Managed Institutions */}
			<div className="space-y-4">
				<div>
					<h2 className="font-serif text-xl font-bold text-white">All Registered & Managed Institutions</h2>
					<p className="mt-1 text-xs text-slate-300">Overview of active, suspended, and historical institution records on Sepolia.</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					{institutions.map((item) => {
						const logoUrl = item.profile?.logo ? resolveIpfsUrl(item.profile.logo) : ''
						const isApproved = item.status === INSTITUTION_STATUS.APPROVED
						const isSuspended = item.status === INSTITUTION_STATUS.SUSPENDED

						return (
							<article key={item.address} className="rounded-3xl border border-white/10 bg-[#0F172A]/80 p-6 space-y-4 shadow-xl">
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-center gap-3">
										<div className="h-10 w-10 rounded-xl border border-white/10 bg-slate-950 flex items-center justify-center overflow-hidden">
											{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <span>🏛️</span>}
										</div>
										<div>
											<h3 className="font-serif text-base font-bold text-white">{item.profile?.name || 'Institution'}</h3>
											<p className="font-mono text-xs text-slate-300">{shortenAddress(item.address)}</p>
										</div>
									</div>
									<span className={["rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest", isApproved ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : isSuspended ? 'border-rose-500/40 bg-rose-500/15 text-rose-300' : 'border-white/10 bg-white/5 text-slate-300'].join(' ')}>
										{INSTITUTION_STATUS_LABELS[item.status] || 'Unknown'}
									</span>
								</div>

								<div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
									<span className="font-mono text-[11px] text-slate-400 truncate max-w-[260px]">{item.profileURI}</span>
									<div className="flex gap-2">
										{isApproved ? (
											<button
												type="button"
												disabled={working === item.address}
												onClick={() => executeAction(item.address, suspendV2Institution, 'Suspend Institution')}
												className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-60"
											>
												Suspend
											</button>
										) : null}
										{isSuspended ? (
											<button
												type="button"
												disabled={working === item.address}
												onClick={() => executeAction(item.address, reactivateV2Institution, 'Reactivate Institution')}
												className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-60"
											>
												Reactivate
											</button>
										) : null}
									</div>
								</div>
							</article>
						)
					})}
				</div>
			</div>

			{/* Section 3: Admin Credential Revocation Panel */}
			<div className="rounded-3xl border border-rose-500/30 bg-[#0F172A] p-6 sm:p-8 space-y-6 shadow-2xl">
				<div>
					<div className="flex items-center gap-2">
						<span className="text-xl">⚠️</span>
						<h2 className="font-serif text-xl font-bold text-white">System Credential Revocation Controls</h2>
					</div>
					<p className="mt-1 text-xs text-slate-300">
						As contract owner, you can revoke any invalid, fraudulent, or disputed credential directly on-chain on Sepolia.
					</p>
				</div>

				<form onSubmit={handleSearchCredential} className="flex flex-col sm:flex-row gap-3">
					<input
						value={revokeTokenId}
						onChange={(e) => setRevokeTokenId(e.target.value)}
						placeholder="Enter Token ID (e.g. 1)"
						className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-rose-500 transition focus:ring-2"
					/>
					<button
						type="submit"
						disabled={searchingCred}
						className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 transition disabled:opacity-60"
					>
						{searchingCred ? 'Searching...' : 'Lookup Credential'}
					</button>
				</form>

				{credError ? (
					<p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl">⚠️ {credError}</p>
				) : null}

				{searchCredential ? (
					<div className="rounded-2xl border border-white/15 bg-slate-950 p-6 space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
							<div>
								<span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Token #{searchCredential.tokenId}</span>
								<h3 className="font-serif text-lg font-bold text-white">{searchCredential.achievementTitle}</h3>
							</div>
							<span className={["rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest", searchCredential.revoked ? 'border-rose-500/40 bg-rose-500/15 text-rose-300' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'].join(' ')}>
								{searchCredential.revoked ? 'CURRENTLY REVOKED' : 'CURRENTLY VALID'}
							</span>
						</div>

						<div className="grid gap-2 text-xs text-slate-300">
							<p><strong className="text-slate-400">Issuer:</strong> {searchCredential.issuerName} ({searchCredential.issuer})</p>
							<p><strong className="text-slate-400">Student Wallet:</strong> <span className="font-mono text-slate-200">{searchCredential.holder}</span></p>
							<p><strong className="text-slate-400">Issue Date:</strong> {searchCredential.issueDate}</p>
						</div>

						{!searchCredential.revoked ? (
							<button
								type="button"
								disabled={revokingCred}
								onClick={() => handleRevokeCredential(searchCredential.tokenId)}
								className="rounded-xl border border-rose-500/40 bg-rose-500 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-600 transition shadow-lg shadow-rose-500/20 disabled:opacity-60"
							>
								{revokingCred ? 'Executing Revocation Transaction...' : '🚨 Revoke Credential On-Chain'}
							</button>
						) : (
							<p className="text-xs text-slate-400 italic">This credential has already been revoked on Sepolia.</p>
						)}
					</div>
				) : null}
			</div>
		</section>
	)
}
