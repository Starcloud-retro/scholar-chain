import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import IssueCredential from './pages/IssueCredential'
import VerifyCredential from './pages/VerifyCredential'
import MyCredentials from './pages/MyCredentials'
import AdminDashboard from './pages/AdminDashboard'
import Admin from './pages/Admin'
import IssuerApplication from './pages/IssuerApplication'
import {
	connectWallet,
	switchAccountPermissions,
} from './contracts/ScholarChainService'
import {
	getV2Owner,
	INSTITUTION_STATUS,
	resolveInstitutionProfile,
	SEPOLIA_CHAIN_ID,
	switchToSepoliaNetwork,
} from './contracts/ScholarChainV2Service'

function App() {
	const [account, setAccount] = useState('')
	const [chainId, setChainId] = useState('')
	const [isWalletReady, setIsWalletReady] = useState(false)
	const [contractOwner, setContractOwner] = useState('')
	const [isAuthorizedIssuerRole, setIsAuthorizedIssuerRole] = useState(false)
	const [isContractOwner, setIsContractOwner] = useState(false)
	const [organizationLabel, setOrganizationLabel] = useState('')
	const [institutionProfile, setInstitutionProfile] = useState(null)
	const [networkError, setNetworkError] = useState('')

	const refreshWalletState = useCallback(async () => {
		if (!window.ethereum) return

		const providerAccounts = await window.ethereum.request({ method: 'eth_accounts' })
		const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })

		setAccount(providerAccounts?.[0] || '')
		setChainId(currentChainId || '')
	}, [])

	useEffect(() => {
		if (!window.ethereum) return undefined

		const handleAccountsChanged = (accounts) => {
			setAccount(accounts?.[0] || '')
			window.ethereum
				.request({ method: 'eth_chainId' })
				.then((currentChainId) => setChainId(currentChainId || ''))
				.catch(() => setChainId(''))
		}

		const handleChainChanged = (newChain) => {
			setChainId(newChain || '')
			refreshWalletState().catch(() => {
				setAccount('')
				setChainId('')
			})
		}

		window.ethereum.on('accountsChanged', handleAccountsChanged)
		window.ethereum.on('chainChanged', handleChainChanged)

		const bootstrapWalletState = async () => {
			try {
				await refreshWalletState()
			} catch {
				setAccount('')
				setChainId('')
			} finally {
				setIsWalletReady(true)
			}
		}

		void bootstrapWalletState()

		return () => {
			window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
			window.ethereum.removeListener('chainChanged', handleChainChanged)
		}
	}, [refreshWalletState])

	useEffect(() => {
		let mounted = true

		const loadRoleState = async () => {
			if (!account) {
				setContractOwner('')
				setIsAuthorizedIssuerRole(false)
				setIsContractOwner(false)
				setOrganizationLabel('')
				setInstitutionProfile(null)
				return
			}

			try {
				const [ownerAddress, profile] = await Promise.all([
					getV2Owner(),
					resolveInstitutionProfile(account, true),
				])

				if (!mounted) return

				const normalizedAccount = account.toLowerCase()
				const normalizedOwner = ownerAddress.toLowerCase()
				const ownerMatch = normalizedAccount === normalizedOwner
				const authorizedIssuer = profile?.status === INSTITUTION_STATUS.APPROVED

				setContractOwner(ownerAddress)
				setIsContractOwner(ownerMatch)
				setIsAuthorizedIssuerRole(authorizedIssuer)
				setInstitutionProfile(profile)
				setOrganizationLabel(
					ownerMatch
						? 'ScholarChain Governance Admin'
						: authorizedIssuer
						? profile?.name || 'Approved Institution'
						: '',
				)
			} catch {
				if (!mounted) return
				setContractOwner('')
				setIsAuthorizedIssuerRole(false)
				setIsContractOwner(false)
				setOrganizationLabel('')
				setInstitutionProfile(null)
			}
		}

		void loadRoleState()

		return () => {
			mounted = false
		}
	}, [account])

	const isSepolia = useMemo(() => {
		if (!chainId) return true
		const numericChain = parseInt(chainId, 16)
		return numericChain === Number(SEPOLIA_CHAIN_ID) || chainId === SEPOLIA_CHAIN_ID
	}, [chainId])

	const handleSwitchNetwork = useCallback(async () => {
		setNetworkError('')
		try {
			await switchToSepoliaNetwork()
			await refreshWalletState()
		} catch (err) {
			setNetworkError(err.message || 'Failed to switch network')
		}
	}, [refreshWalletState])

	const handleConnectWallet = async () => {
		const result = await connectWallet()
		setAccount(result.account)
		setChainId(result.chainId)
	}

	const handleSwitchAccount = async () => {
		const result = await switchAccountPermissions()
		setAccount(result.account)
		setChainId(result.chainId)
	}

	const handleDisconnectWallet = () => {
		setAccount('')
		setChainId('')
	}

	const walletState = useMemo(
		() => ({
			account,
			setAccount,
			chainId,
			setChainId,
			isSepolia,
			isWalletReady,
			contractOwner,
			isAuthorizedIssuerRole,
			isContractOwner,
			organizationLabel,
			institutionProfile,
			roleLabel: isContractOwner ? 'Admin' : isAuthorizedIssuerRole ? 'Institution' : 'Student',
			roleIcon: isContractOwner ? '🛡️' : isAuthorizedIssuerRole ? '🏛️' : '🎓',
			handleConnectWallet,
			handleSwitchAccount,
			handleDisconnectWallet,
			handleSwitchNetwork,
		}),
		[
			account,
			chainId,
			isSepolia,
			isWalletReady,
			contractOwner,
			isAuthorizedIssuerRole,
			isContractOwner,
			organizationLabel,
			institutionProfile,
			handleSwitchNetwork,
		],
	)

	return (
		<BrowserRouter>
			<div className="min-h-screen bg-[#070A10] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
				{/* Background ambient lighting for deep dark academic feel */}
				<div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
					<div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-900/10 blur-[140px]" />
					<div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-indigo-950/20 blur-[160px]" />
					<div className="absolute -bottom-20 left-1/3 h-[500px] w-[600px] rounded-full bg-slate-900/40 blur-[150px]" />
				</div>

				{!isSepolia && account ? (
					<div className="relative z-30 bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-center text-xs font-semibold text-amber-200 backdrop-blur-md flex items-center justify-center gap-3">
						<span>⚠️ You are connected to an unsupported network (Chain ID: {chainId}). Switch to Sepolia Testnet to interact with V2 smart contract.</span>
						<button
							type="button"
							onClick={handleSwitchNetwork}
							className="rounded-md bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
						>
							Switch to Sepolia
						</button>
						{networkError ? <span className="text-rose-400 font-normal">({networkError})</span> : null}
					</div>
				) : null}

				<Navbar walletState={walletState} />

				<main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
					<Routes>
						<Route path="/" element={<Home walletState={walletState} />} />
						<Route path="/issue" element={<IssueCredential walletState={walletState} />} />
						<Route path="/verify" element={<VerifyCredential />} />
						<Route path="/dashboard" element={<MyCredentials walletState={walletState} />} />
						<Route path="/issuer-dashboard" element={<AdminDashboard walletState={walletState} />} />
						<Route path="/issuer-application" element={<IssuerApplication walletState={walletState} />} />
						<Route path="/admin" element={<Admin walletState={walletState} />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</main>
			</div>
		</BrowserRouter>
	)
}

export default App
