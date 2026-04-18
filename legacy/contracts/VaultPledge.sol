// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  VaultPledge
 * @notice Trustless on-chain crowdfunding on Ethereum Sepolia.
 *         Creators launch time-locked vaults with an ETH goal.
 *         Goal met  → creator calls release() and receives funds.
 *         Goal miss → pledgers call refund() and reclaim ETH.
 * @dev    Orange Belt Level 3 dApp
 */
contract VaultPledge {

    struct Vault {
        uint256 id;
        address payable creator;
        string  title;
        string  description;
        uint256 goal;       // wei
        uint256 raised;     // wei
        uint256 deadline;   // unix timestamp
        bool    released;
        bool    exists;
    }

    uint256 public vaultCount;
    mapping(uint256 => Vault)  public vaults;
    mapping(uint256 => mapping(address => uint256)) public pledges;

    event VaultCreated(uint256 indexed id, address indexed creator, string title, uint256 goal, uint256 deadline);
    event Pledged(uint256 indexed id, address indexed pledger, uint256 amount);
    event Released(uint256 indexed id, address indexed creator, uint256 amount);
    event Refunded(uint256 indexed id, address indexed pledger, uint256 amount);

    error GoalMustBePositive();
    error DurationMustBePositive();
    error TitleRequired();
    error VaultNotFound();
    error DeadlinePassed();
    error DeadlineNotReached();
    error GoalNotMet();
    error GoalAlreadyMet();
    error AlreadyReleased();
    error NotCreator();
    error ZeroPledge();
    error NoPledgeFound();
    error TransferFailed();

    modifier exists(uint256 _id) {
        if (!vaults[_id].exists) revert VaultNotFound();
        _;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    function createVault(
        string calldata _title,
        string calldata _description,
        uint256 _goal,
        uint256 _durationDays
    ) external returns (uint256 id) {
        if (_goal == 0)                revert GoalMustBePositive();
        if (_durationDays == 0)        revert DurationMustBePositive();
        if (bytes(_title).length == 0) revert TitleRequired();

        id = ++vaultCount;
        vaults[id] = Vault({
            id:          id,
            creator:     payable(msg.sender),
            title:       _title,
            description: _description,
            goal:        _goal,
            raised:      0,
            deadline:    block.timestamp + (_durationDays * 1 days),
            released:    false,
            exists:      true
        });

        emit VaultCreated(id, msg.sender, _title, _goal, vaults[id].deadline);
    }

    // ── Pledge ────────────────────────────────────────────────────────────────

    function pledge(uint256 _id) external payable exists(_id) {
        if (msg.value == 0)                         revert ZeroPledge();
        if (block.timestamp > vaults[_id].deadline) revert DeadlinePassed();
        if (vaults[_id].released)                   revert AlreadyReleased();

        vaults[_id].raised       += msg.value;
        pledges[_id][msg.sender] += msg.value;
        emit Pledged(_id, msg.sender, msg.value);
    }

    // ── Release ───────────────────────────────────────────────────────────────

    function release(uint256 _id) external exists(_id) {
        Vault storage v = vaults[_id];
        if (msg.sender != v.creator)       revert NotCreator();
        if (block.timestamp <= v.deadline) revert DeadlineNotReached();
        if (v.raised < v.goal)             revert GoalNotMet();
        if (v.released)                    revert AlreadyReleased();

        v.released = true;
        uint256 amount = v.raised;
        (bool ok,) = v.creator.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Released(_id, v.creator, amount);
    }

    // ── Refund ────────────────────────────────────────────────────────────────

    function refund(uint256 _id) external exists(_id) {
        Vault storage v = vaults[_id];
        if (block.timestamp <= v.deadline) revert DeadlineNotReached();
        if (v.raised >= v.goal)            revert GoalAlreadyMet();
        if (v.released)                    revert AlreadyReleased();

        uint256 amount = pledges[_id][msg.sender];
        if (amount == 0) revert NoPledgeFound();

        pledges[_id][msg.sender] = 0; // CEI: zero before transfer
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Refunded(_id, msg.sender, amount);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    function getVault(uint256 _id) external view exists(_id) returns (Vault memory) {
        return vaults[_id];
    }

    function getAllVaults() external view returns (Vault[] memory all) {
        all = new Vault[](vaultCount);
        for (uint256 i = 1; i <= vaultCount; i++) {
            all[i - 1] = vaults[i];
        }
    }

    function getPledge(uint256 _id, address _pledger) external view exists(_id) returns (uint256) {
        return pledges[_id][_pledger];
    }

    function isGoalMet(uint256 _id) external view exists(_id) returns (bool) {
        return vaults[_id].raised >= vaults[_id].goal;
    }
}
