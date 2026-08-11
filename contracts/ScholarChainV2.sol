// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ScholarChain V2
/// @notice A registry of approved institutions and their non-transferable credentials.
/// @dev Institution profile files and credential artwork live on IPFS; ownership and
///      validity live on-chain.
contract ScholarChainV2 is ERC721URIStorage, Ownable {
    enum CredentialType {
        Academic,
        Internship,
        Workshop,
        Competition,
        Volunteer,
        Research
    }

    enum InstitutionStatus {
        None,
        Pending,
        Approved,
        Rejected,
        Suspended
    }

    struct Institution {
        string profileURI;
        InstitutionStatus status;
        uint256 appliedAt;
        uint256 approvedAt;
        uint256 updatedAt;
    }

    struct Credential {
        string credentialId;
        string achievementTitle;
        address issuer;
        uint256 issuedAt;
        CredentialType credentialType;
        bool revoked;
    }

    struct CredentialInfo {
        string credentialId;
        string achievementTitle;
        address issuer;
        uint256 issuedAt;
        CredentialType credentialType;
        bool revoked;
        address holder;
        string metadataURI;
    }

    error EmptyURI();
    error InvalidAddress();
    error InvalidCredentialType();
    error CredentialAlreadyExists();
    error CredentialDoesNotExist();
    error CredentialAlreadyRevoked();
    error TransferNotAllowed();
    error InstitutionAlreadyApproved();
    error InstitutionIsNotPending();
    error InstitutionIsNotApproved();
    error UnauthorizedInstitution();

    uint256 private _nextTokenId;

    mapping(address => Institution) private institutions;
    address[] private institutionList;
    mapping(address => uint256) private institutionIndex;

    mapping(uint256 => Credential) private credentials;
    mapping(string => bool) private credentialIdExists;
    mapping(address => uint256[]) private credentialIdsByHolder;
    mapping(address => uint256[]) private credentialIdsByIssuer;

    event InstitutionApplied(address indexed institution, string profileURI);
    event InstitutionProfileUpdated(address indexed institution, string previousURI, string newURI);
    event InstitutionApproved(address indexed institution, string profileURI);
    event InstitutionRejected(address indexed institution, string profileURI);
    event InstitutionSuspended(address indexed institution);
    event InstitutionReactivated(address indexed institution);
    event CredentialMinted(
        address indexed student,
        address indexed institution,
        uint256 indexed tokenId,
        string credentialId,
        string achievementTitle,
        CredentialType credentialType,
        string metadataURI
    );
    event CredentialRevoked(uint256 indexed tokenId, string credentialId);

    constructor() ERC721("ScholarChain Credential", "SCRED") Ownable(msg.sender) {}

    /// @notice Submit an institution profile stored on IPFS for administrator review.
    function applyForInstitution(string calldata profileURI) external {
        if (bytes(profileURI).length == 0) revert EmptyURI();

        Institution storage institution = institutions[msg.sender];
        if (institution.status == InstitutionStatus.Approved) revert InstitutionAlreadyApproved();

        if (institutionIndex[msg.sender] == 0) {
            institutionList.push(msg.sender);
            institutionIndex[msg.sender] = institutionList.length;
        }

        institution.profileURI = profileURI;
        institution.status = InstitutionStatus.Pending;
        institution.appliedAt = block.timestamp;
        institution.updatedAt = block.timestamp;

        emit InstitutionApplied(msg.sender, profileURI);
    }

    /// @notice Lets a pending or approved institution update its IPFS profile.
    /// @dev The event creates a permanent audit trail of every profile change.
    function updateInstitutionProfile(string calldata profileURI) external {
        if (bytes(profileURI).length == 0) revert EmptyURI();

        Institution storage institution = institutions[msg.sender];
        if (
            institution.status != InstitutionStatus.Pending &&
            institution.status != InstitutionStatus.Approved
        ) revert UnauthorizedInstitution();

        string memory previousURI = institution.profileURI;
        institution.profileURI = profileURI;
        institution.updatedAt = block.timestamp;

        emit InstitutionProfileUpdated(msg.sender, previousURI, profileURI);
    }

    function approveInstitution(address institutionAddress) external onlyOwner {
        if (institutionAddress == address(0)) revert InvalidAddress();

        Institution storage institution = institutions[institutionAddress];
        if (institution.status != InstitutionStatus.Pending) revert InstitutionIsNotPending();

        institution.status = InstitutionStatus.Approved;
        institution.approvedAt = block.timestamp;
        institution.updatedAt = block.timestamp;

        emit InstitutionApproved(institutionAddress, institution.profileURI);
    }

    function rejectInstitution(address institutionAddress) external onlyOwner {
        if (institutionAddress == address(0)) revert InvalidAddress();

        Institution storage institution = institutions[institutionAddress];
        if (institution.status != InstitutionStatus.Pending) revert InstitutionIsNotPending();

        institution.status = InstitutionStatus.Rejected;
        institution.updatedAt = block.timestamp;

        emit InstitutionRejected(institutionAddress, institution.profileURI);
    }

    /// @notice Stops future minting without deleting the institution's credential history.
    function suspendInstitution(address institutionAddress) external onlyOwner {
        Institution storage institution = institutions[institutionAddress];
        if (institution.status != InstitutionStatus.Approved) revert InstitutionIsNotApproved();

        institution.status = InstitutionStatus.Suspended;
        institution.updatedAt = block.timestamp;
        emit InstitutionSuspended(institutionAddress);
    }

    function reactivateInstitution(address institutionAddress) external onlyOwner {
        Institution storage institution = institutions[institutionAddress];
        if (institution.status != InstitutionStatus.Suspended) revert InstitutionIsNotApproved();

        institution.status = InstitutionStatus.Approved;
        institution.updatedAt = block.timestamp;
        emit InstitutionReactivated(institutionAddress);
    }

    function mintCredential(
        address student,
        string calldata credentialId,
        string calldata achievementTitle,
        uint8 credentialType,
        string calldata metadataURI
    ) external returns (uint256 tokenId) {
        if (institutions[msg.sender].status != InstitutionStatus.Approved) {
            revert UnauthorizedInstitution();
        }
        if (student == address(0)) revert InvalidAddress();
        if (bytes(credentialId).length == 0 || bytes(achievementTitle).length == 0) revert EmptyURI();
        if (bytes(metadataURI).length == 0) revert EmptyURI();
        if (credentialType > uint8(CredentialType.Research)) revert InvalidCredentialType();
        if (credentialIdExists[credentialId]) revert CredentialAlreadyExists();

        tokenId = ++_nextTokenId;
        _safeMint(student, tokenId);
        _setTokenURI(tokenId, metadataURI);

        credentials[tokenId] = Credential({
            credentialId: credentialId,
            achievementTitle: achievementTitle,
            issuer: msg.sender,
            issuedAt: block.timestamp,
            credentialType: CredentialType(credentialType),
            revoked: false
        });
        credentialIdExists[credentialId] = true;
        credentialIdsByHolder[student].push(tokenId);
        credentialIdsByIssuer[msg.sender].push(tokenId);

        emit CredentialMinted(
            student,
            msg.sender,
            tokenId,
            credentialId,
            achievementTitle,
            CredentialType(credentialType),
            metadataURI
        );
    }

    function revokeCredential(uint256 tokenId) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) revert CredentialDoesNotExist();
        if (credentials[tokenId].revoked) revert CredentialAlreadyRevoked();

        credentials[tokenId].revoked = true;
        emit CredentialRevoked(tokenId, credentials[tokenId].credentialId);
    }

    function getInstitution(address institutionAddress) external view returns (Institution memory) {
        return institutions[institutionAddress];
    }

    function getInstitutionCount() external view returns (uint256) {
        return institutionList.length;
    }

    function getInstitutionAt(uint256 index) external view returns (address) {
        return institutionList[index];
    }

    function getCredential(uint256 tokenId) external view returns (CredentialInfo memory) {
        address holder = _ownerOf(tokenId);
        if (holder == address(0)) revert CredentialDoesNotExist();

        Credential memory credential = credentials[tokenId];
        return CredentialInfo({
            credentialId: credential.credentialId,
            achievementTitle: credential.achievementTitle,
            issuer: credential.issuer,
            issuedAt: credential.issuedAt,
            credentialType: credential.credentialType,
            revoked: credential.revoked,
            holder: holder,
            metadataURI: tokenURI(tokenId)
        });
    }

    function getCredentialsOfHolder(address holder) external view returns (uint256[] memory) {
        return credentialIdsByHolder[holder];
    }

    function getCredentialsOfInstitution(address institution) external view returns (uint256[] memory) {
        return credentialIdsByIssuer[institution];
    }

    function totalCredentialsIssued() external view returns (uint256) {
        return _nextTokenId;
    }

    function isCredentialValid(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0) && !credentials[tokenId].revoked;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address previousOwner = super._update(to, tokenId, auth);
        if (previousOwner != address(0) && to != address(0)) revert TransferNotAllowed();
        return previousOwner;
    }
}
