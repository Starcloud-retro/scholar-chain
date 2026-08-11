import { useEffect, useState } from 'react'
import CredentialCard from '../components/CredentialCard'
import CredentialDetailsModal from '../components/CredentialDetailsModal'
import {
	fetchV2Metadata,
	getV2CredentialsOfHolder,
} from '../contracts/ScholarChainV2Service'

function shortenAddress(address) {
	if (!address) return ''
	return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function MyCredentials({ walletState }) {
	const { account } = walletState
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [credentials, setCredentials] = useState([])
	const [selectedCredential, setSelectedCredential] = useState(null)

	useEffect(() => {
		let mounted = true
		const load = async () => {
			setError('')
			setCredentials([])
			setSelectedCredential(null)

			if (!account) return

			setLoading(true)
			try {
				const onChainCredentials = await getV2CredentialsOfHolder(account)
				if (!onChainCredentials.length) {
					if (mounted) setCredentials([])
					return
				}

				const items = await Promise.all(
					onChainCredentials.map(async (credential) => {
						try {
							const metadata = await fetchV2Metadata(credential.metadataURI)
							return { ...credential, metadata }
						} catch {
							return { ...credential, metadata: null }
						}
					}),
				)

				if (mounted) setCredentials(items)
			} catch (e) {
				if (mounted) setError(e.message || 'Failed to load credentials from Sepolia')
			} finally {
				if (mounted) setLoading(false)
			}
		}

		void load()

		return () => {
			mounted = false
		}
	}, [account])

	return (
		<section className="mx-auto max-w-7xl space-y-8">
			{/* Portfolio header */}
			<div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-slate-950 to-[#0B0F17] p-6 sm:p-8 shadow-2xl">
				<div className="flex flex-wrap items-center justify-between gap-6">
					<div>
						<div className="flex items-center gap-2">
							<span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
								🎓 Student Credential Vault
							</span>
						</div>
						<h1 className="mt-2 font-serif text-3xl font-bold text-white">My Academic Credentials</h1>
						<p className="mt-1 text-xs text-slate-300">
							Permanently stored on Sepolia smart contract. Credentials are non-transferable (soulbound) to your student wallet.
						</p>
					</div>

					{account ? (
						<div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-right font-mono text-xs">
							<span className="text-[10px] uppercase font-bold text-slate-400 block">Connected Student Wallet</span>
							<span className="text-amber-300 font-bold">{shortenAddress(account)}</span>
						</div>
					) : null}
				</div>
			</div>

			{!account ? (
				<div className="rounded-3xl border border-white/10 bg-[#0F172A]/80 p-8 text-center backdrop-blur-xl shadow-2xl space-y-3">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl">
						🔑
					</div>
					<h2 className="font-serif text-xl font-bold text-white">Wallet Connection Required</h2>
					<p className="text-xs text-slate-300">Connect your Ethereum web3 wallet to view your personal academic credential vault.</p>
				</div>
			) : null}

			{error ? (
				<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
					⚠️ {error}
				</div>
			) : null}

			{loading ? (
				<div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xs text-amber-300 italic">
					⌛ Querying Sepolia contract for credentials owned by {shortenAddress(account)}...
				</div>
			) : null}

			{!loading && account && credentials.length === 0 && !error ? (
				<div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center space-y-4">
					<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-2xl text-slate-400">
						📜
					</div>
					<div>
						<h3 className="font-serif text-lg font-bold text-white">No Credentials Yet</h3>
						<p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
							No soulbound credentials have been minted to{' '}
							<span className="font-mono text-amber-300">{account}</span> on Sepolia yet.
						</p>
					</div>
					<div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 max-w-sm mx-auto text-left space-y-1.5">
						<p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Demo Flow</p>
						<p className="text-xs text-slate-400">
							Switch to the institution wallet in MetaMask, go to{' '}
							<span className="text-amber-300 font-semibold">Mint Credential</span>, use
							the <span className="text-amber-300 font-semibold">Demo Quick-Fill</span>{' '}
							button, and mint a credential to this address.
						</p>
					</div>
				</div>
			) : null}

			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{credentials.map((c) => (
					<CredentialCard key={c.tokenId} credential={c} onOpen={setSelectedCredential} />
				))}
			</div>

			{selectedCredential ? (
				<CredentialDetailsModal credential={selectedCredential} onClose={() => setSelectedCredential(null)} />
			) : null}
		</section>
	)
}
