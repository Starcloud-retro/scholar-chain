import { useState } from 'react'
import CredentialCard from '../components/CredentialCard'
import CredentialDetailsModal from '../components/CredentialDetailsModal'
import {
	decodeContractError,
	fetchV2Metadata,
	getV2Credential,
	getV2CredentialsOfHolder,
	resolveIpfsUrl,
} from '../contracts/ScholarChainV2Service'

export default function VerifyCredential() {
	const [tokenId, setTokenId] = useState('')
	const [credential, setCredential] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [selectedCredential, setSelectedCredential] = useState(null)
	const [walletAddress, setWalletAddress] = useState('')
	const [walletCredentials, setWalletCredentials] = useState([])
	const [activeTab, setActiveTab] = useState('token') // 'token' | 'wallet'

	const handleVerifyToken = async (event) => {
		event.preventDefault()
		setError('')
		setCredential(null)
		setSelectedCredential(null)

		if (!tokenId.trim()) {
			setError('Please enter a valid numeric Token ID.')
			return
		}

		setLoading(true)
		try {
			const data = await getV2Credential(tokenId.trim())
			let metadata = null

			try {
				metadata = await fetchV2Metadata(data.metadataURI)
			} catch {
				metadata = null
			}

			setCredential({
				...data,
				metadata,
			})
		} catch (verifyError) {
			setError(decodeContractError(verifyError))
		} finally {
			setLoading(false)
		}
	}

	const handleWalletLookup = async (event) => {
		event.preventDefault()
		setError('')
		setWalletCredentials([])
		setSelectedCredential(null)

		if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) {
			setError('Please enter a valid 42-character Ethereum wallet address.')
			return
		}

		setLoading(true)
		try {
			const rawItems = await getV2CredentialsOfHolder(walletAddress.trim())
			const enrichedItems = await Promise.all(
				rawItems.map(async (item) => {
					try {
						const metadata = await fetchV2Metadata(item.metadataURI)
						return { ...item, metadata }
					} catch {
						return { ...item, metadata: null }
					}
				}),
			)
			setWalletCredentials(enrichedItems)
		} catch (lookupError) {
			setError(decodeContractError(lookupError))
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className="mx-auto max-w-5xl space-y-8">
			{/* Header */}
			<div className="text-center space-y-3">
				<div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
					🔍 Public Verification Engine
				</div>
				<h1 className="font-serif text-3xl sm:text-4xl font-bold text-white">Verify Academic Credentials</h1>
				<p className="mx-auto max-w-2xl text-xs sm:text-sm text-slate-300">
					Anyone can instantly verify academic credentials on the Sepolia blockchain. No web3 wallet or browser extension is required.
				</p>
			</div>

			{/* Tab navigation */}
			<div className="flex justify-center border-b border-white/10 pb-4">
				<div className="inline-flex rounded-2xl border border-white/10 bg-slate-900 p-1.5 backdrop-blur-md">
					<button
						type="button"
						onClick={() => {
							setActiveTab('token')
							setError('')
						}}
						className={[
							'rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200',
							activeTab === 'token'
								? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
								: 'text-slate-400 hover:text-white',
						].join(' ')}
					>
						Verify Token ID
					</button>
					<button
						type="button"
						onClick={() => {
							setActiveTab('wallet')
							setError('')
						}}
						className={[
							'rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200',
							activeTab === 'wallet'
								? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
								: 'text-slate-400 hover:text-white',
						].join(' ')}
					>
						Lookup Student Wallet
					</button>
				</div>
			</div>

			{error ? (
				<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1 text-center">
					<p className="text-xs font-bold text-rose-300">⚠️ Lookup Failed</p>
					<p className="text-xs text-rose-200">{error}</p>
					{error.includes('does not exist') || error.includes('not minted') ? (
						<p className="text-[11px] text-slate-400 mt-1">
							Tip: Token IDs are assigned sequentially starting from 1 after the first
							credential is minted by an approved institution.
						</p>
					) : null}
				</div>
			) : null}

			{/* Token ID Form */}
			{activeTab === 'token' ? (
				<form
					onSubmit={handleVerifyToken}
					className="rounded-3xl border border-white/10 bg-[#0F172A]/90 p-6 sm:p-8 space-y-4 shadow-2xl backdrop-blur-xl"
				>
					<div>
						<h2 className="font-serif text-lg font-bold text-white">Single Token Verification</h2>
						<p className="mt-1 text-xs text-slate-300">Enter the unique numeric Token ID issued on ScholarChain V2.</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						<input
							value={tokenId}
							onChange={(e) => setTokenId(e.target.value)}
							placeholder="Enter Token ID (e.g. 1)"
							className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
						/>
						<button
							type="submit"
							disabled={loading}
							className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-60"
						>
							{loading ? 'Verifying On Sepolia...' : 'Verify Token'}
						</button>
					</div>

					{credential ? (
						<div className="pt-4 border-t border-white/10 space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<span className="text-xs font-bold uppercase tracking-wider text-amber-300">Verified Result</span>
								{credential.metadataURI ? (
									<a
										href={resolveIpfsUrl(credential.metadataURI)}
										target="_blank"
										rel="noreferrer"
										className="text-xs font-semibold text-amber-400 hover:underline"
									>
										🔗 View Raw IPFS Metadata
									</a>
								) : null}
							</div>
							<div className="max-w-md mx-auto">
								<CredentialCard credential={credential} onOpen={setSelectedCredential} />
							</div>
						</div>
					) : null}
				</form>
			) : null}

			{/* Wallet Lookup Form */}
			{activeTab === 'wallet' ? (
				<form
					onSubmit={handleWalletLookup}
					className="rounded-3xl border border-white/10 bg-[#0F172A]/90 p-6 sm:p-8 space-y-4 shadow-2xl backdrop-blur-xl"
				>
					<div>
						<h2 className="font-serif text-lg font-bold text-white">Student Portfolio Lookup</h2>
						<p className="mt-1 text-xs text-slate-300">Enter a public 0x... wallet address to view all valid credentials held on Sepolia.</p>
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						<input
							value={walletAddress}
							onChange={(e) => setWalletAddress(e.target.value)}
							placeholder="Enter Wallet Address (0x...)"
							className="flex-1 rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
						/>
						<button
							type="submit"
							disabled={loading}
							className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-60"
						>
							{loading ? 'Searching Sepolia...' : 'View Wallet Portfolio'}
						</button>
					</div>

					{!loading && walletCredentials.length === 0 && walletAddress && !error ? (
						<div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center space-y-2">
							<p className="text-2xl">📜</p>
							<p className="text-xs font-bold text-white">No Credentials Found</p>
							<p className="text-xs text-slate-400">
								No credentials have been issued to{' '}
								<span className="font-mono text-amber-300">{walletAddress}</span> yet.
								Ask an approved institution to mint a credential to this wallet.
							</p>
						</div>
					) : null}
					{walletCredentials.length > 0 ? (
						<div className="pt-4 border-t border-white/10 space-y-4">
							<p className="text-xs font-bold uppercase tracking-wider text-amber-300">
								Found {walletCredentials.length} Credential(s) for Wallet
							</p>
							<div className="grid gap-6 sm:grid-cols-2">
								{walletCredentials.map((item) => (
									<CredentialCard key={item.tokenId} credential={item} onOpen={setSelectedCredential} />
								))}
							</div>
						</div>
					) : null}
				</form>
			) : null}

			{selectedCredential ? (
				<CredentialDetailsModal credential={selectedCredential} onClose={() => setSelectedCredential(null)} />
			) : null}
		</section>
	)
}
