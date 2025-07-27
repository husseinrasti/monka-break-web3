// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MonkaBreak
 * @notice Minimal on-chain logic to handle game funding, starting, and reward distribution
 * @dev Real-time team-based strategy game where players compete as Thieves and Police
 */
contract MonkaBreak {
    /// @notice Minimum entry fee required to start a game (1 MON)
    uint256 public constant MIN_ENTRY_FEE = 1 ether;

    /// @notice Represents a game room
    struct Game {
        address creator;
        uint256 vault;
        uint256 entryFee;
        uint256 startBlock;
        bool started;
        bool finalized;
    }

    /// @notice Mapping from game ID to game data
    mapping(uint256 => Game) public games;

    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator);
    event GameStarted(uint256 indexed gameId, uint256 vault, uint256 blockNumber);
    event GameFinalized(uint256 indexed gameId, address[] winners);

    // Custom errors
    error GameAlreadyExists();
    error GameNotFound();
    error GameAlreadyStarted();
    error GameNotStarted();
    error GameAlreadyFinalized();
    error OnlyCreatorCanCall();
    error InsufficientEntryFee();
    error NoWinners();
    error TransferFailed();

    modifier gameExists(uint256 gameId) {
        if (games[gameId].creator == address(0)) revert GameNotFound();
        _;
    }

    modifier gameNotStarted(uint256 gameId) {
        if (games[gameId].started) revert GameAlreadyStarted();
        _;
    }

    modifier gameStarted(uint256 gameId) {
        if (!games[gameId].started) revert GameNotStarted();
        _;
    }

    modifier gameNotFinalized(uint256 gameId) {
        if (games[gameId].finalized) revert GameAlreadyFinalized();
        _;
    }

    modifier onlyCreator(uint256 gameId) {
        if (games[gameId].creator != msg.sender) revert OnlyCreatorCanCall();
        _;
    }

    /**
     * @notice Creates a new game with a unique ID and creator
     * @param gameId Unique identifier for the game (must be unique)
     * @dev No funds are sent during creation
     */
    function createGame(uint256 gameId) external {
        if (games[gameId].creator != address(0)) revert GameAlreadyExists();
        
        games[gameId] = Game({
            creator: msg.sender,
            vault: 0,
            entryFee: 0,
            startBlock: 0,
            started: false,
            finalized: false
        });
        
        emit GameCreated(gameId, msg.sender);
    }

    /**
     * @notice Starts the game and locks the entry fee into the vault
     * @param gameId The ID of the game to start
     * @dev Requires minimum entry fee of 2 MON, can only be called by creator
     */
    function startGame(uint256 gameId) 
        external 
        payable 
        gameExists(gameId) 
        gameNotStarted(gameId) 
        onlyCreator(gameId) 
    {
        if (msg.value < MIN_ENTRY_FEE) revert InsufficientEntryFee();
        
        Game storage game = games[gameId];
        game.entryFee = msg.value;
        game.vault = msg.value;
        game.startBlock = block.number;
        game.started = true;
        
        emit GameStarted(gameId, msg.value, block.number);
    }

    /**
     * @notice Finalizes the game and distributes the vault to winners
     * @param gameId The ID of the game to finalize
     * @param winners Array of winner addresses to receive equal shares of the vault
     * @dev Can only be called by creator and only once per game
     */
    function finalizeGame(uint256 gameId, address[] calldata winners) 
        external 
        gameExists(gameId) 
        gameStarted(gameId) 
        gameNotFinalized(gameId) 
        onlyCreator(gameId) 
    {
        if (winners.length == 0) revert NoWinners();
        
        Game storage game = games[gameId];
        game.finalized = true;
        
        uint256 prizePerWinner = game.vault / winners.length;
        
        for (uint256 i = 0; i < winners.length; i++) {
            (bool success, ) = winners[i].call{value: prizePerWinner}("");
            if (!success) revert TransferFailed();
        }
        
        // Clear the vault after distribution
        game.vault = 0;
        
        emit GameFinalized(gameId, winners);
    }

    /**
     * @notice Gets the complete game data for a given game ID
     * @param gameId The ID of the game to query
     * @return creator The address that created the game
     * @return vault The current vault balance
     * @return entryFee The entry fee that was set when the game started
     * @return startBlock The block number when the game was started
     * @return started Whether the game has been started
     * @return finalized Whether the game has been finalized
     */
    function getGame(uint256 gameId) 
        external 
        view 
        gameExists(gameId) 
        returns (
            address creator,
            uint256 vault,
            uint256 entryFee,
            uint256 startBlock,
            bool started,
            bool finalized
        ) 
    {
        Game storage game = games[gameId];
        return (
            game.creator,
            game.vault,
            game.entryFee,
            game.startBlock,
            game.started,
            game.finalized
        );
    }
} 