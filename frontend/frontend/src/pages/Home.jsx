import { Link } from 'react-router-dom'
import { V2_CONTRACT_ADDRESS } from '../contracts/ScholarChainV2Service'

const howItWorks = [
	{
		step: '01',
		icon: '🏛️',
		title: 'Institutions apply',
		body: 'Universities, colleges, and training providers apply to join ScholarChain. Once approved by the admin, they can start issuing credentials.',
	},
	{
		step: '02',
		icon: '🎓',
		title: 'Credentials are issued',
		body: 'An approved institution fills in the student details and achievement, then mints the credential directly from their account. It is recorded permanently.',
	},
	{
		step: '03',
		icon: '🔍',
		title: 'Anyone can verify',
		body: 'Employers, universities, or anyone else can paste a credential ID or student wallet address on the Verify page — no account needed — and instantly confirm it is genuine.',
	},
]

const forWho = [
	{
		icon: '🎓',
		title: 'Students',
		color: 'border-blue-500/30 bg-blue-500/10',
		labelColor: 'text-blue-300',
		items: [
			'View all credentials issued to your wallet',
			'Share a permanent, tamper-proof record with employers',
			'No paperwork — your achievements live on the blockchain',
		],
	},
	{
		icon: '🏛️',
		title: 'Institutions',
		color: 'border-amber-500/30 bg-amber-500/10',
		labelColor: 'text-amber-300',
		items: [
			'Apply once to become a verified issuer',
			'Issue credentials to students in seconds',
			'Manage your issued certificates from your portal',
		],
	},
	{
		icon: '🔍',
		title: 'Employers & Verifiers',
		color: 'border-emerald-500/30 bg-emerald-500/10',
		labelColor: 'text-emerald-300',
		items: [
			'Verify any credential instantly — no account required',
			'Check revocation status in real time',
			'Confirm the issuing institution is legitimate',
		],
	},
]

export default function Home({ walletState }) {
	const { isAuthorizedIssuerRole, isContractOwner, account } = walletState

	return (
		<div className="space-y-16 py-4">
			{/* ── Hero ─────────────────────────────────────────────────────────── */}
			<section className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-[#0F172A] via-slate-950 to-[#070A10] p-8 sm:p-16 shadow-2xl shadow-black/80">
				<div className="absolute right-0 top-0 h-96 w-96 translate-x-20 -translate-y-20 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
				<div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-16 translate-y-16 rounded-full bg-indigo-900/20 blur-[100px] pointer-events-none" />

				<div className="relative mx-auto max-w-4xl text-center space-y-6">
					<div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md">
						📜 Blockchain-Verified Academic Credentials
					</div>

					<h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
						Academic credentials<br />
						<span className="text-amber-300">you can actually trust</span>
					</h1>

					<p className="mx-auto max-w-2xl text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
						ScholarChain lets universities and training providers issue digital
						credentials that are permanently recorded and publicly verifiable.
						Students own their record. Employers verify in seconds. No emails,
						no paperwork, no waiting.
					</p>

					{/* Role-aware CTAs */}
					<div className="pt-4 flex flex-wrap items-center justify-center gap-4">
						<Link
							to="/verify"
							className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 hover:scale-[1.02]"
						>
							🔍 Verify a Credential
						</Link>

						{isContractOwner ? (
							<Link
								to="/admin"
								className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/25"
							>
								🛡️ Admin Panel
							</Link>
						) : isAuthorizedIssuerRole ? (
							<>
								<Link
									to="/issue"
									className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/25"
								>
									🎓 Issue a Credential
								</Link>
								<Link
									to="/issuer-dashboard"
									className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/10"
								>
									🏛️ Institution Portal
								</Link>
							</>
						) : (
							<>
								<Link
									to="/dashboard"
									className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-200 transition hover:bg-white/10 hover:text-white"
								>
									🎓 My Credentials
								</Link>
								{!account ? (
									<Link
										to="/issuer-application"
										className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-amber-300 transition hover:bg-amber-500/20"
									>
										🏛️ Apply as an Institution
									</Link>
								) : null}
							</>
						)}
					</div>

					{/* Contract address */}
					<div className="pt-4 flex items-center justify-center gap-3 text-xs text-slate-500 font-mono">
						<span>Contract:</span>
						<a
							href={`https://sepolia.etherscan.io/address/${V2_CONTRACT_ADDRESS}`}
							target="_blank"
							rel="noreferrer"
							className="text-slate-400 hover:text-amber-400 transition break-all"
						>
							{V2_CONTRACT_ADDRESS}
						</a>
					</div>
				</div>
			</section>

			{/* ── Who it's for ──────────────────────────────────────────────────── */}
			<section className="space-y-6">
				<div className="text-center">
					<h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">Who uses ScholarChain?</h2>
					<p className="mt-2 text-sm text-slate-400">
						Built for every person in the credential journey.
					</p>
				</div>
				<div className="grid gap-6 md:grid-cols-3">
					{forWho.map((item) => (
						<article
							key={item.title}
							className={[
								'group rounded-3xl border p-7 shadow-xl backdrop-blur-md transition duration-300 hover:-translate-y-1',
								item.color,
							].join(' ')}
						>
							<div className={['text-[10px] font-bold uppercase tracking-widest mb-3', item.labelColor].join(' ')}>
								{item.icon} {item.title}
							</div>
							<ul className="space-y-2.5">
								{item.items.map((line) => (
									<li key={line} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
										<span className="mt-0.5 text-amber-400 shrink-0">→</span>
										{line}
									</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</section>

			{/* ── How it works ──────────────────────────────────────────────────── */}
			<section className="rounded-3xl border border-white/10 bg-[#0B0F17] p-8 sm:p-12 space-y-8 shadow-2xl">
				<div className="text-center space-y-2">
					<h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">How it works</h2>
					<p className="text-sm text-slate-400">Three simple steps from issuance to verification.</p>
				</div>
				<div className="grid gap-8 sm:grid-cols-3">
					{howItWorks.map((item) => (
						<div key={item.step} className="space-y-3">
							<div className="flex items-center gap-3">
								<span className="text-3xl font-serif font-bold text-amber-500/40">{item.step}</span>
								<span className="text-2xl">{item.icon}</span>
							</div>
							<h3 className="font-serif text-base font-bold text-white">{item.title}</h3>
							<p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
						</div>
					))}
				</div>
			</section>

			{/* ── Why blockchain ────────────────────────────────────────────────── */}
			<section className="grid gap-6 md:grid-cols-3">
				{[
					{
						icon: '🔒',
						title: 'Cannot be faked',
						body: 'Every credential is written permanently to the blockchain. No institution, admin, or third party can silently alter or delete it.',
					},
					{
						icon: '⚡',
						title: 'Instant verification',
						body: 'Anyone can verify a credential in seconds using just the credential ID or the student\'s wallet address — completely free, no account needed.',
					},
					{
						icon: '🏅',
						title: 'Students own their record',
						body: 'Credentials are issued directly to the student\'s wallet. They travel with the student for life and cannot be taken away.',
					},
				].map((item) => (
					<article
						key={item.title}
						className="group rounded-3xl border border-white/10 bg-[#0F172A]/80 p-8 shadow-xl backdrop-blur-md transition duration-300 hover:border-amber-500/40 hover:-translate-y-1"
					>
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl group-hover:scale-110 transition">
							{item.icon}
						</div>
						<h3 className="mt-5 font-serif text-lg font-bold text-white group-hover:text-amber-200 transition">
							{item.title}
						</h3>
						<p className="mt-2 text-xs leading-relaxed text-slate-300">{item.body}</p>
					</article>
				))}
			</section>
		</div>
	)
}
