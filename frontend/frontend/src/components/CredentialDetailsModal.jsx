import { resolveIpfsUrl } from '../contracts/ScholarChainV2Service'

function DetailRow({ label, value, children }) {
	return (
		<div className="grid gap-1 rounded-xl border border-white/10 bg-white/5 p-3.5 sm:grid-cols-[160px_1fr] sm:gap-4 items-center">
			<dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
				{label}
			</dt>
			<dd className="min-w-0 text-xs text-slate-100 font-medium">
				{children || <span className="break-all">{value || 'N/A'}</span>}
			</dd>
		</div>
	)
}

function resolveImageSource(credential) {
	const image = credential?.imageSource || credential?.metadata?.image || credential?.metadata?.image_url || credential?.metadata?.imageUrl
	if (!image) return ''
	return resolveIpfsUrl(image)
}

async function copyText(value) {
	if (!value) return
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(value)
	}
}

export default function CredentialDetailsModal({ credential, onClose }) {
	if (!credential) return null

	const imageSource = resolveImageSource(credential)
	const metadataLink = resolveIpfsUrl(credential.metadataURI || '')
	const issuerProfile = credential.issuerProfile

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
			<button
				type="button"
				aria-label="Close credential details"
				onClick={onClose}
				className="fixed inset-0 bg-[#070A10]/85 backdrop-blur-md transition-opacity"
			/>

			<div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-[#0B0F17] shadow-2xl shadow-black/80 my-8">
				<div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/60">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-xl">
							📜
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
								Academic Credential Record
							</p>
							<h2 className="font-serif text-lg font-bold text-white">{credential.achievementTitle || 'Credential Details'}</h2>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
					>
						Close
					</button>
				</div>

				<div className="grid gap-6 p-6 lg:grid-cols-[340px_1fr]">
					<div className="space-y-4">
						<div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner">
							<div className="aspect-[4/5] bg-slate-950 flex items-center justify-center overflow-hidden">
								{imageSource ? (
									<img src={imageSource} alt={credential.achievementTitle} className="h-full w-full object-cover" />
								) : (
									<div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
										<span className="text-4xl mb-2">🎓</span>
										<span className="text-xs">No artwork preview</span>
									</div>
								)}
							</div>
							<div className="border-t border-white/10 p-4 bg-slate-900/40 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[10px] uppercase tracking-wider text-slate-400">On-Chain Status</span>
									<span className={["inline-flex rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest", credential.revoked ? 'border-rose-500/40 bg-rose-500/15 text-rose-300' : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'].join(' ')}>
										{credential.revoked ? 'REVOKED' : 'VALID & VERIFIED'}
									</span>
								</div>
								<div className="flex items-center justify-between text-xs">
									<span className="text-[10px] uppercase tracking-wider text-slate-400">Token ID</span>
									<span className="font-mono text-slate-200 font-bold">#{credential.tokenId}</span>
								</div>
							</div>
						</div>

						{issuerProfile ? (
							<div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
								<div className="flex items-center gap-2">
									{issuerProfile.logo ? (
										<img src={issuerProfile.logo} alt={issuerProfile.name} className="h-6 w-6 rounded-full object-cover border border-amber-500/30" />
									) : (
										<span>🏛️</span>
									)}
									<span className="text-xs font-bold text-amber-300">{issuerProfile.name}</span>
								</div>
								{issuerProfile.description ? (
									<p className="text-[11px] text-slate-300 line-clamp-2">{issuerProfile.description}</p>
								) : null}
								{issuerProfile.website ? (
									<a href={issuerProfile.website} target="_blank" rel="noreferrer" className="block text-[11px] font-semibold text-amber-400 hover:underline">
										🌐 {issuerProfile.website}
									</a>
								) : null}
							</div>
						) : null}
					</div>

					<div className="space-y-3">
						<DetailRow label="Achievement Title" value={credential.achievementTitle} />
						<DetailRow label="Credential ID" value={credential.credentialId}>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-mono text-slate-200">{credential.credentialId || 'N/A'}</span>
								<button
									type="button"
									onClick={() => copyText(credential.credentialId)}
									className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
								>
									Copy ID
								</button>
							</div>
						</DetailRow>
						<DetailRow label="Student Wallet" value={credential.holder}>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-mono text-xs text-slate-200 break-all">{credential.holder || 'N/A'}</span>
								<button
									type="button"
									onClick={() => copyText(credential.holder)}
									className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
								>
									Copy Wallet
								</button>
							</div>
						</DetailRow>
						<DetailRow label="Issuer Address" value={credential.issuer}>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<span className="font-mono text-xs text-slate-300 break-all">{credential.issuer}</span>
								<button
									type="button"
									onClick={() => copyText(credential.issuer)}
									className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
								>
									Copy Issuer
								</button>
							</div>
						</DetailRow>
						<DetailRow label="Issue Date" value={credential.issueDate} />
						<DetailRow label="Credential Category" value={credential.credentialTypeLabel} />
						<DetailRow label="Metadata URI">
							{metadataLink ? (
								<a
									href={metadataLink}
									target="_blank"
									rel="noreferrer"
									className="break-all font-mono text-xs text-amber-300 underline underline-offset-4 hover:text-amber-200"
								>
									🔗 {credential.metadataURI}
								</a>
							) : (
								<span>N/A</span>
							)}
						</DetailRow>

						{credential.metadata ? (
							<div className="rounded-2xl border border-white/10 bg-slate-950 p-4 space-y-2">
								<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parsed IPFS Metadata</p>
								<pre className="max-h-40 overflow-auto rounded-xl bg-slate-900/80 p-3 font-mono text-[11px] text-slate-300">
									{JSON.stringify(credential.metadata, null, 2)}
								</pre>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	)
}

