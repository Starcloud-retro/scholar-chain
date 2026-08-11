function resolveImageSource(metadata) {
	const image = metadata?.image || metadata?.image_url || metadata?.imageUrl
	if (!image) return ''
	if (image.startsWith('ipfs://')) {
		return `https://ipfs.io/ipfs/${image.replace('ipfs://', '')}`
	}
	return image
}

function shortenAddress(address) {
	if (!address) return ''
	return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function CredentialCard({ credential, onOpen }) {
	if (!credential) return null

	const imageSource = resolveImageSource(credential.metadata)
	const statusLabel = credential.revoked ? 'REVOKED' : 'VERIFIED'
	const statusClass = credential.revoked
		? 'border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
		: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
	const cardTitle = credential.achievementTitle || credential.metadata?.name || 'Academic Credential'
	const holderLabel = shortenAddress(credential.holder)
	const issuerName = credential.issuerName || shortenAddress(credential.issuer)
	const issuerLogo = credential.issuerLogo || ''

	const handleCardOpen = () => {
		onOpen?.(credential)
	}

	return (
		<button
			type="button"
			onClick={handleCardOpen}
			className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0F172A]/80 text-left shadow-xl shadow-black/50 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10"
		>
			<div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
				{imageSource ? (
					<img
						src={imageSource}
						alt={cardTitle}
						className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				) : (
					<div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-center">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl shadow-inner">
							🎓
						</div>
						<p className="mt-3 font-serif text-sm font-semibold text-slate-300">{cardTitle}</p>
					</div>
				)}

				<div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[10px] font-mono font-medium text-slate-300 backdrop-blur-md">
					<span className="text-slate-500">ID #</span>
					{credential.tokenId}
				</div>

				<div
					className={[
						'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase backdrop-blur-md',
						statusClass,
					].join(' ')}
				>
					<span>{credential.revoked ? '❌' : '✓'}</span>
					{statusLabel}
				</div>
			</div>

			<div className="flex flex-1 flex-col justify-between p-5 space-y-4">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						{issuerLogo ? (
							<img src={issuerLogo} alt={issuerName} className="h-5 w-5 rounded-full object-cover border border-white/10" />
						) : (
							<span className="text-xs">🏛️</span>
						)}
						<p className="truncate text-xs font-semibold uppercase tracking-wider text-amber-300/90" title={issuerName}>
							{issuerName}
						</p>
					</div>
					<h3 className="font-serif text-lg font-bold text-white line-clamp-1 group-hover:text-amber-200 transition" title={cardTitle}>
						{cardTitle}
					</h3>
				</div>

				<div className="grid gap-2 text-xs border-t border-white/10 pt-3">
					<div className="flex items-center justify-between text-slate-300">
						<span className="text-[10px] uppercase tracking-wider text-slate-400">Type</span>
						<span className="font-medium text-slate-100">{credential.credentialTypeLabel}</span>
					</div>
					<div className="flex items-center justify-between text-slate-300">
						<span className="text-[10px] uppercase tracking-wider text-slate-400">Issued</span>
						<span className="font-medium text-slate-200">{credential.issueDate || 'N/A'}</span>
					</div>
					<div className="flex items-center justify-between text-slate-300">
						<span className="text-[10px] uppercase tracking-wider text-slate-400">Student Wallet</span>
						<span className="font-mono text-slate-300" title={credential.holder}>{holderLabel}</span>
					</div>
				</div>

				<div className="flex items-center justify-between pt-1">
					<span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-amber-400 transition">
						View Certificate & Detail →
					</span>
				</div>
			</div>
		</button>
	)
}

