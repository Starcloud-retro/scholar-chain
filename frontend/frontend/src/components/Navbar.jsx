import { Link, NavLink } from 'react-router-dom'
import WalletConnect from './WalletConnect'

function navClass({ isActive }) {
	return [
		'relative rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-200',
		isActive
			? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
			: 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent',
	].join(' ')
}

export default function Navbar({ walletState }) {
	const {
		account,
		isAuthorizedIssuerRole,
		isContractOwner,
		organizationLabel,
		handleConnectWallet,
		handleDisconnectWallet,
	} = walletState

	return (
		<header className="sticky top-0 z-20 border-b border-white/10 bg-[#0B0F17]/85 backdrop-blur-2xl shadow-xl shadow-black/40">
			<div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
				{/* Brand Logo */}
				<Link to="/" className="flex items-center gap-3 group">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/20 via-slate-900 to-indigo-950 shadow-inner group-hover:border-amber-400 transition">
						<span className="text-xl">📜</span>
					</div>
					<div>
						<span className="font-serif text-xl font-bold tracking-tight text-white group-hover:text-amber-200 transition">
							ScholarChain
						</span>
					</div>
				</Link>

				{/* Role-tailored navigation */}
				<nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
					<NavLink to="/" className={navClass}>
						Home
					</NavLink>
					<NavLink to="/verify" className={navClass}>
						Verify
					</NavLink>

					{/* Admin views */}
					{isContractOwner ? (
						<NavLink to="/admin" className={navClass}>
							Admin Governance
						</NavLink>
					) : null}

					{/* Approved Institution views */}
					{isAuthorizedIssuerRole ? (
						<>
							<NavLink to="/issuer-dashboard" className={navClass}>
								Institution Portal
							</NavLink>
							<NavLink to="/issue" className={navClass}>
								Issue Credential
							</NavLink>
						</>
					) : null}

					{/* Student / Visitor views */}
					{!isContractOwner && !isAuthorizedIssuerRole ? (
						<>
							<NavLink to="/dashboard" className={navClass}>
								My Credentials
							</NavLink>
							<NavLink to="/issuer-application" className={navClass}>
								Apply as Institution
							</NavLink>
						</>
					) : null}
				</nav>

				{/* Wallet Status Header */}
				<WalletConnect
					account={account}
					organizationLabel={organizationLabel}
					roleLabel={walletState.roleLabel}
					roleIcon={walletState.roleIcon}
					onConnected={handleConnectWallet}
					onDisconnected={handleDisconnectWallet}
					buttonClassName="px-4 py-2"
				/>
			</div>
		</header>
	)
}
