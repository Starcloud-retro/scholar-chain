import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	applyForV2Institution,
	decodeContractError,
	fetchV2Metadata,
	getV2Institution,
	INSTITUTION_STATUS,
	INSTITUTION_STATUS_LABELS,
	resolveIpfsUrl,
} from '../contracts/ScholarChainV2Service'

const initialProfileForm = {
	name: '',
	type: 'University',
	officialEmail: '',
	website: '',
	country: '',
	description: '',
	logo: '',
	// Advanced manual URI override
	manualProfileURI: '',
	useManualURI: false,
}

export default function IssuerApplication({ walletState }) {
	const { account } = walletState
	const [form, setForm] = useState(initialProfileForm)
	const [institution, setInstitution] = useState(null)
	const [loading, setLoading] = useState(false)
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [showAdvanced, setShowAdvanced] = useState(false)

	const loadInstitution = useCallback(async () => {
		if (!account) return
		try {
			const data = await getV2Institution(account)
			setInstitution(data)
		} catch {
			setInstitution(null)
		}
	}, [account])

	useEffect(() => {
		let mounted = true
		if (account) {
			Promise.resolve().then(() => {
				if (mounted) loadInstitution()
			})
		}
		return () => {
			mounted = false
		}
	}, [account, loadInstitution])

	// Auto-build base64 data URI from institution form fields
	const computedProfileURI = useMemo(() => {
		if (form.useManualURI && form.manualProfileURI.trim()) {
			return form.manualProfileURI.trim()
		}
		if (!form.name || !form.officialEmail) return ''
		const json = {
			name: form.name.trim(),
			type: form.type,
			officialEmail: form.officialEmail.trim(),
			website: form.website.trim(),
			country: form.country.trim(),
			description: form.description.trim(),
			logo: form.logo.trim(),
			appliedAt: new Date().toISOString(),
		}
		const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2))))
		return `data:application/json;base64,${encoded}`
	}, [form])

	const update = (e) => {
		const { name, value, type, checked } = e.target
		setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
	}

	const applyDemoPreset = () => {
		setForm({
			name: 'ScholarChain Test University',
			type: 'University',
			officialEmail: 'credentials@scholarchain.edu',
			website: 'https://scholarchain.edu',
			country: 'United States',
			description: 'A global university committed to issuing verified, blockchain-backed academic credentials.',
			logo: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/award.svg',
			manualProfileURI: '',
			useManualURI: false,
		})
		setError('')
		setMessage('')
	}

	const submit = async (event) => {
		event.preventDefault()
		setMessage('')
		setError('')

		if (!account) {
			setError('Connect your institution wallet first.')
			return
		}

		if (!computedProfileURI) {
			setError('Fill in your institution name and official email to generate your profile.')
			return
		}

		setLoading(true)
		try {
			await applyForV2Institution(computedProfileURI)
			setMessage('Application submitted successfully! The admin can now review and approve your institution.')
			await loadInstitution()
		} catch (submitError) {
			setError(decodeContractError(submitError))
		} finally {
			setLoading(false)
		}
	}

	const status = institution?.status ?? INSTITUTION_STATUS.NONE
	const statusBadgeClass =
		status === INSTITUTION_STATUS.APPROVED
			? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
			: status === INSTITUTION_STATUS.PENDING
			? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
			: status === INSTITUTION_STATUS.REJECTED || status === INSTITUTION_STATUS.SUSPENDED
			? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
			: 'border-white/10 bg-white/5 text-slate-300'

	return (
		<section className="mx-auto max-w-3xl space-y-6">
			<div className="rounded-3xl border border-white/10 bg-[#0F172A]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-6">
				{/* Page Header */}
				<div>
					<div className="flex items-center gap-2">
						<span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
							Onboarding Portal
						</span>
					</div>
					<h1 className="mt-2 font-serif text-3xl font-bold text-white">Apply as an Issuer Institution</h1>
					<p className="mt-1 text-xs text-slate-300 leading-relaxed">
						Fill out your university or organization details below to submit an onboarding application. Once approved by the admin, your wallet can issue credentials.
					</p>
				</div>

				{/* Wallet Status Pill */}
				{account ? (
					<div className="rounded-2xl border border-white/10 bg-slate-950 p-4 space-y-1">
						<span className="text-[10px] uppercase font-bold text-slate-400">Applicant Wallet Address</span>
						<p className="font-mono text-xs text-amber-300 font-semibold break-all">{account}</p>
					</div>
				) : (
					<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
						💡 Connect your institution's wallet in the header before applying.
					</div>
				)}

				{/* On-Chain Application Status */}
				{institution && status !== INSTITUTION_STATUS.NONE ? (
					<div className="space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900 p-4">
							<span className="text-xs font-semibold text-slate-300">Current Application Status:</span>
							<span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${statusBadgeClass}`}>
								{INSTITUTION_STATUS_LABELS[status]}
							</span>
						</div>

						{status === INSTITUTION_STATUS.APPROVED ? (
							<div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3">
								<div className="flex items-center gap-2 text-emerald-300">
									<span className="text-xl">🎉</span>
									<p className="text-xs font-bold uppercase tracking-wider">Institution Approved on Sepolia!</p>
								</div>
								<p className="text-xs text-emerald-200 leading-relaxed">
									Your wallet address (<span className="font-mono font-semibold">{account}</span>) has been verified and authorized by the governance administrator. You can now issue credentials to students.
								</p>
								<div className="pt-1 flex flex-wrap gap-3">
									<a
										href="/issue"
										className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg hover:bg-emerald-400 transition"
									>
										🎓 Go to Issue Credential Portal →
									</a>
									<a
										href="/issuer-dashboard"
										className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 transition"
									>
										🏛️ Institution Portal
									</a>
								</div>
							</div>
						) : null}
					</div>
				) : null}

				{/* Application Form */}
				<form onSubmit={submit} className="space-y-5">
					{/* Demo Presets */}
					<div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-center justify-between gap-4">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">⚡ Demo Presets</p>
							<p className="text-xs text-slate-400">Auto-fill sample university details in one click.</p>
						</div>
						<button
							type="button"
							onClick={applyDemoPreset}
							className="shrink-0 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-500/25 transition"
						>
							Fill Demo Info
						</button>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Institution Name *</span>
							<input
								name="name"
								value={form.name}
								onChange={update}
								placeholder="e.g. ScholarChain Test University"
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={loading || status === INSTITUTION_STATUS.APPROVED}
							/>
						</label>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Institution Type *</span>
							<select
								name="type"
								value={form.type}
								onChange={update}
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={loading || status === INSTITUTION_STATUS.APPROVED}
							>
								<option value="University">University / College</option>
								<option value="Training Academy">Training Academy / Institute</option>
								<option value="Research Organization">Research Organization</option>
								<option value="Corporate Employer">Corporate Employer</option>
							</select>
						</label>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Official Email *</span>
							<input
								type="email"
								name="officialEmail"
								value={form.officialEmail}
								onChange={update}
								placeholder="e.g. credentials@university.edu"
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={loading || status === INSTITUTION_STATUS.APPROVED}
							/>
						</label>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Website URL</span>
							<input
								name="website"
								value={form.website}
								onChange={update}
								placeholder="e.g. https://university.edu"
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={loading || status === INSTITUTION_STATUS.APPROVED}
							/>
						</label>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Country</span>
							<input
								name="country"
								value={form.country}
								onChange={update}
								placeholder="e.g. United States, India"
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={loading || status === INSTITUTION_STATUS.APPROVED}
							/>
						</label>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Logo Image URL</span>
							<input
								name="logo"
								value={form.logo}
								onChange={update}
								placeholder="ipfs://... or https://..."
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={loading || status === INSTITUTION_STATUS.APPROVED}
							/>
						</label>
					</div>

					<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
						<span>Description</span>
						<textarea
							name="description"
							value={form.description}
							onChange={update}
							rows={2}
							placeholder="Brief summary of your academic institution..."
							className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2 resize-none"
							disabled={loading || status === INSTITUTION_STATUS.APPROVED}
						/>
					</label>

					{/* Advanced Manual IPFS Override */}
					<div>
						<button
							type="button"
							onClick={() => setShowAdvanced((v) => !v)}
							className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-amber-300 transition"
						>
							<span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
							Advanced — enter a manual IPFS profile URI instead
						</button>

						{showAdvanced ? (
							<div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
								<label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
									<input
										type="checkbox"
										name="useManualURI"
										checked={form.useManualURI}
										onChange={update}
										className="accent-amber-400"
									/>
									Use a manual IPFS profile URI
								</label>
								{form.useManualURI ? (
									<input
										name="manualProfileURI"
										value={form.manualProfileURI}
										onChange={update}
										placeholder="ipfs://bafkrei..."
										className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
										disabled={loading || status === INSTITUTION_STATUS.APPROVED}
									/>
								) : null}
							</div>
						) : null}
					</div>

					{/* Submit Button */}
					<button
						type="submit"
						disabled={loading || !account || status === INSTITUTION_STATUS.APPROVED}
						className="w-full rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading
							? 'Submitting Application...'
							: status === INSTITUTION_STATUS.APPROVED
							? '✓ Institution Already Approved'
							: 'Submit Onboarding Application'}
					</button>

					{message ? (
						<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
							✓ {message}
						</div>
					) : null}

					{error ? (
						<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
							⚠️ {error}
						</div>
					) : null}
				</form>
			</div>
		</section>
	)
}
