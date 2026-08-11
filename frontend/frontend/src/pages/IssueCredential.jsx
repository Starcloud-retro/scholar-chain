import { useMemo, useState } from 'react'
import { CREDENTIAL_TYPE_OPTIONS } from '../contracts/credentialTypes'
import {
	buildCredentialMetadataURI,
	decodeContractError,
	mintV2Credential,
} from '../contracts/ScholarChainV2Service'

// ─── Demo Quick-Fill Presets ─────────────────────────────────────────────────
const DEMO_STUDENT = '0x8D665e3D77bcA5141E04a2E0324E53b9Cb91cD6A'

// ─── Credential type labels matching the ABI enum order ─────────────────────
const TYPE_LABELS = ['Academic', 'Internship', 'Workshop', 'Competition', 'Volunteer', 'Research']

const emptyMeta = {
	institutionName: '',
	duration: '',
	description: '',
	imageUri: '',
}

const initialForm = {
	student: '',
	credentialId: '',
	achievementTitle: '',
	credentialType: '0',
	// metadata fields
	issueDate: new Date().toISOString().split('T')[0],
	duration: '',
	description: '',
	imageUri: '',
	// advanced override
	manualMetadataURI: '',
	useManualURI: false,
}

function buildId() {
	const y = new Date().getFullYear()
	const rand = Math.random().toString(36).slice(2, 7).toUpperCase()
	return `SC-${y}-${rand}`
}

export default function IssueCredential({ walletState }) {
	const { account, isAuthorizedIssuerRole, institutionProfile } = walletState
	const [form, setForm] = useState(initialForm)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [result, setResult] = useState(null)
	const [error, setError] = useState('')
	const [showAdvanced, setShowAdvanced] = useState(false)
	const [metaPreview, setMetaPreview] = useState('')

	// ── Derived values ──────────────────────────────────────────────────────
	const institutionName =
		institutionProfile?.name || account?.slice(0, 6) || 'My Institution'

	const computedMetaURI = useMemo(() => {
		if (form.useManualURI && form.manualMetadataURI.trim()) {
			return form.manualMetadataURI.trim()
		}
		if (!form.student || !form.credentialId || !form.achievementTitle) return ''
		return buildCredentialMetadataURI({
			institutionName,
			credentialTitle: form.achievementTitle,
			credentialId: form.credentialId,
			credentialType: TYPE_LABELS[Number(form.credentialType)] ?? 'Academic',
			studentAddress: form.student,
			issueDate: form.issueDate,
			duration: form.duration,
			description: form.description,
			logoUri: institutionProfile?.logo || '',
			imageUri: form.imageUri,
		})
	}, [form, institutionName, institutionProfile])

	const canSubmit =
		form.student &&
		form.credentialId &&
		form.achievementTitle &&
		computedMetaURI

	// ── Handlers ────────────────────────────────────────────────────────────
	const update = (e) => {
		const { name, value, type, checked } = e.target
		setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
	}

	const applyDemoFill = () => {
		setForm((prev) => ({
			...prev,
			student: DEMO_STUDENT,
			credentialId: buildId(),
			achievementTitle: 'Bachelor of Computer Science with Honors',
			credentialType: '0',
			issueDate: new Date().toISOString().split('T')[0],
			duration: '4 years',
			description:
				'Awarded for the successful completion of a four-year Bachelor of Computer Science programme with First Class Honours.',
		}))
		setError('')
		setResult(null)
	}

	const handlePreview = () => {
		setMetaPreview(computedMetaURI ? atob(computedMetaURI.split(',')[1] || '') : '')
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setResult(null)

		if (!account) {
			setError('Connect your institution wallet first.')
			return
		}
		if (!isAuthorizedIssuerRole) {
			setError('Only an approved institution wallet can mint credentials.')
			return
		}
		if (!computedMetaURI) {
			setError('Fill in all required fields so the metadata can be generated.')
			return
		}

		setIsSubmitting(true)
		try {
			const minted = await mintV2Credential({
				student: form.student.trim(),
				credentialId: form.credentialId.trim(),
				achievementTitle: form.achievementTitle.trim(),
				credentialType: Number(form.credentialType),
				metadataURI: computedMetaURI,
			})
			setResult(minted)
			setForm(initialForm)
			setMetaPreview('')
		} catch (err) {
			setError(decodeContractError(err))
		} finally {
			setIsSubmitting(false)
		}
	}

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<section className="mx-auto max-w-3xl space-y-6">
			{/* Page header */}
			<div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0F172A] via-slate-950 to-[#070A10] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
				<div className="flex items-center gap-2">
					<span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
						Institution Portal
					</span>
				</div>
				<h1 className="mt-2 font-serif text-3xl font-bold text-white">
					Issue a Credential
				</h1>
				<p className="mt-1 text-xs text-slate-300 leading-relaxed">
					Fill in the student details and achievement below. The credential will be
					issued to the student's wallet and permanently recorded. The student can
					then share and verify it anywhere.
				</p>

				{/* Issuing institution badge */}
				{institutionProfile ? (
					<div className="mt-4 flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
						{institutionProfile.logo ? (
							<img
								src={institutionProfile.logo}
								alt={institutionProfile.name}
								className="h-10 w-10 rounded-full object-cover border border-amber-500/30"
							/>
						) : (
							<span className="text-2xl">🏛️</span>
						)}
						<div>
							<p className="text-xs font-bold text-amber-300">
								Issuer: {institutionProfile.name}
							</p>
							<p className="font-mono text-[11px] text-slate-400">{account}</p>
						</div>
					</div>
				) : null}
			</div>

			{/* Not connected or not authorized */}
			{!account ? (
				<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-slate-300">
					🔑 Connect an approved institution wallet in the header to mint credentials.
				</div>
			) : !isAuthorizedIssuerRole ? (
				<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-2">
					<p className="text-xs font-bold text-rose-300">⛔ Not Authorized</p>
					<p className="text-xs text-rose-200">
						Your connected wallet is not an approved institution.
						Switch to the institution wallet or apply to become an issuer first.
					</p>
				</div>
			) : (
				<form
					className="rounded-3xl border border-white/10 bg-[#0F172A]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-6"
					onSubmit={handleSubmit}
				>
					{/* ── Quick Demo Fill ──────────────────────────────────────── */}
					<div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
						<p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
							⚡ Demo Quick-Fill
						</p>
						<p className="text-xs text-slate-400">
							Pre-populates all fields with sample data for wallet{' '}
							<span className="font-mono text-indigo-300">0x8D66…cD6A</span> (student demo
							account).
						</p>
						<button
							type="button"
							onClick={applyDemoFill}
							className="mt-1 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-bold text-indigo-200 transition hover:bg-indigo-500/25"
						>
							Fill Demo Values
						</button>
					</div>

					{/* ── Recipient ────────────────────────────────────────────── */}
					<fieldset className="space-y-4">
						<legend className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/10 w-full">
							Recipient
						</legend>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Student Wallet Address *</span>
							<input
								name="student"
								value={form.student}
								onChange={update}
								placeholder="0x8D665e3D77bcA5141E04a2E0324E53b9Cb91cD6A"
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
								disabled={isSubmitting}
							/>
						</label>
					</fieldset>

					{/* ── Credential Details ───────────────────────────────────── */}
					<fieldset className="space-y-4">
						<legend className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-white/10 w-full">
							Credential Details
						</legend>

						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
								<span>Credential ID / Serial *</span>
								<div className="flex gap-2">
									<input
										name="credentialId"
										value={form.credentialId}
										onChange={update}
										placeholder="e.g. SC-2026-CS101"
										className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
										disabled={isSubmitting}
									/>
									<button
										type="button"
										onClick={() =>
											setForm((p) => ({ ...p, credentialId: buildId() }))
										}
										className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-slate-300 transition hover:bg-white/10"
										title="Auto-generate ID"
									>
										Auto
									</button>
								</div>
							</label>

							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
								<span>Credential Category *</span>
								<select
									name="credentialType"
									value={form.credentialType}
									onChange={update}
									className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
									disabled={isSubmitting}
								>
									{CREDENTIAL_TYPE_OPTIONS.map((item) => (
										<option key={item.value} value={item.value}>
											{item.label}
										</option>
									))}
								</select>
							</label>
						</div>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Achievement Title *</span>
							<input
								name="achievementTitle"
								value={form.achievementTitle}
								onChange={update}
								placeholder="e.g. Bachelor of Computer Science with Honors"
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
								disabled={isSubmitting}
							/>
						</label>

						<div className="grid gap-4 sm:grid-cols-2">
							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
								<span>Issue Date *</span>
								<input
									type="date"
									name="issueDate"
									value={form.issueDate}
									onChange={update}
									className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
									disabled={isSubmitting}
								/>
							</label>

							<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
								<span>Duration (optional)</span>
								<input
									name="duration"
									value={form.duration}
									onChange={update}
									placeholder="e.g. 4 years, 6 months"
									className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2"
									disabled={isSubmitting}
								/>
							</label>
						</div>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Description (optional)</span>
							<textarea
								name="description"
								value={form.description}
								onChange={update}
								rows={2}
								placeholder="Short description of the achievement or credential scope..."
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white outline-none ring-amber-500 transition focus:ring-2 resize-none"
								disabled={isSubmitting}
							/>
						</label>

						<label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 space-y-1.5">
							<span>Certificate Image URI (optional)</span>
							<input
								name="imageUri"
								value={form.imageUri}
								onChange={update}
								placeholder="ipfs://bafk... or https://..."
								className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
								disabled={isSubmitting}
							/>
							<span className="block text-[11px] text-slate-400 font-normal normal-case">
								Upload the credential artwork to Pinata separately and paste the
								ipfs:// URI, or leave blank.
							</span>
						</label>
					</fieldset>

					{/* ── Advanced: Manual URI Override ───────────────────────── */}
					<div>
						<button
							type="button"
							onClick={() => setShowAdvanced((v) => !v)}
							className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-amber-300 transition"
						>
							<span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
							Advanced — use a manual IPFS metadata URI instead
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
									Override auto-generated metadata with a manual URI
								</label>
								{form.useManualURI ? (
									<input
										name="manualMetadataURI"
										value={form.manualMetadataURI}
										onChange={update}
										placeholder="ipfs://bafkrei... or https://..."
										className="w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-xs text-white font-mono outline-none ring-amber-500 transition focus:ring-2"
										disabled={isSubmitting}
									/>
								) : null}
							</div>
						) : null}
					</div>

					{/* ── Metadata preview ─────────────────────────────────────── */}
					{computedMetaURI && !form.useManualURI ? (
						<div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
							<div className="flex items-center justify-between">
								<p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
									Auto-generated Metadata
								</p>
								<button
									type="button"
									onClick={handlePreview}
									className="text-[11px] font-semibold text-amber-400 hover:underline"
								>
									{metaPreview ? 'Hide Preview' : 'Preview JSON'}
								</button>
							</div>
							<p className="text-[11px] text-slate-400">
								The metadata JSON is encoded as a{' '}
								<code className="text-amber-300">data:application/json;base64</code> URI
								and stored on-chain directly — no external service required.
							</p>
							{metaPreview ? (
								<pre className="mt-2 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-[10px] text-emerald-300 whitespace-pre-wrap break-all">
									{metaPreview}
								</pre>
							) : null}
						</div>
					) : null}

					{/* ── Submit ────────────────────────────────────────────────── */}
					<button
						type="submit"
						disabled={!canSubmit || isSubmitting}
						className="w-full rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{isSubmitting ? '⛓️ Recording on blockchain…' : '🎓 Issue Credential'}
					</button>
				</form>
			)}

			{/* Success */}
			{result ? (
				<div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2">
					<p className="text-xs font-bold text-emerald-300">✅ Credential Issued!</p>
					<p className="text-xs text-emerald-200">
						The credential has been recorded. Share the transaction link with the student so they can find their credential ID.
					</p>
					<a
						href={`https://sepolia.etherscan.io/tx/${result.hash}`}
						target="_blank"
						rel="noreferrer"
						className="block font-mono text-[11px] text-amber-300 hover:underline break-all"
					>
						{result.hash}
					</a>
				</div>
			) : null}

			{/* Error */}
			{error ? (
				<div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
					⚠️ {error}
				</div>
			) : null}
		</section>
	)
}
