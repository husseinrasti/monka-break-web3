// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MonkaBreak
 * @notice A real-time, team-based strategy game on blockchain where Thieves attempt to break into a vault while Police try to stop them
 * @dev Implements 4-stage gameplay with path selection, voting, and elimination mechanics
 */
contract MonkaBreak {
    /// @notice Minimum entry fee required to create a game (2 MON)
    uint256 public constant MIN_ENTRY_FEE = 2 ether;
    
    /// @notice Minimum number of thieves required to start a game
    uint256 public constant MIN_THIEVES = 3;
    
    /// @notice Minimum number of police required to start a game
    uint256 public constant MIN_POLICE = 3;
    
    /// @notice Maximum total players allowed in a game
    uint256 public constant MAX_PLAYERS = 10;
    
    /// @notice Total number of game stages
    uint256 public constant TOTAL_STAGES = 4;
    
    /// @notice Number of paths available for selection (A=0, B=1, C=2)
    uint256 public constant NUM_PATHS = 3;

    /// @notice Counter for generating unique game IDs
    uint256 private _gameIdCounter;

    /// @notice Represents a player in the game
    struct Player {
        address addr;
        string nickname;
        bool isThief;
        bool eliminated;
        uint8[TOTAL_STAGES] moves; // Path choices for each stage
        bool hasCommittedMove; // Track if player has committed move for current stage
    }

    /// @notice Represents a game room
    struct GameRoom {
        uint256 id;
        address creator;
        uint256 entryFee;
        uint256 startBlock;
        bool started;
        bool finalized;
        uint256 currentStage; // 0-3 for stages 1-4
        uint256 vault;
        Player[] players;
        mapping(uint256 => uint8) policeVotes; // stage => blocked path
        mapping(uint256 => uint256) policeVoteCount; // stage => number of votes for blocked path
        mapping(address => bool) winners;
        mapping(address => bool) hasVoted; // Track if police has voted in current stage
        uint256 thievesCount;
        uint256 policeCount;
        uint256 aliveThieves;
    }

    /// @notice Mapping from game ID to game room
    mapping(uint256 => GameRoom) private _games;

    /// @notice Default police nicknames
    string[] private _policeNicknames = ["Keone", "Bill", "Mike", "James"];

    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 entryFee);
    event PlayerJoined(uint256 indexed gameId, address indexed player, string nickname, bool isThief);
    event GameStarted(uint256 indexed gameId, uint256 startBlock);
    event MoveCommitted(uint256 indexed gameId, address indexed player, uint256 stage);
    event VoteCast(uint256 indexed gameId, address indexed voter, uint256 stage, uint8 blockedPath);
    event StageCompleted(uint256 indexed gameId, uint256 stage, uint8 blockedPath, address[] eliminatedPlayers);
    event GameFinalized(uint256 indexed gameId, address[] winners, uint256 prizePerWinner);
    event PrizeClaimed(uint256 indexed gameId, address indexed winner, uint256 amount);

    // Custom errors
    error InsufficientEntryFee();
    error GameNotFound();
    error GameAlreadyStarted();
    error GameNotStarted();
    error GameAlreadyFinalized();
    error InvalidTeamSelection();
    error GameIsFull();
    error PlayerAlreadyJoined();
    error InsufficientPlayers();
    error OnlyCreatorCanStart();
    error OnlyCreatorCanFinalize();
    error PlayerNotInGame();
    error PlayerEliminated();
    error InvalidPath();
    error OnlyThievesCanCommitMoves();
    error OnlyPoliceCanVote();
    error MoveAlreadyCommitted();
    error VoteAlreadyCast();
    error GameNotReadyToFinalize();
    error NoWinnings();
    error TransferFailed();
    error InvalidStage();

    modifier gameExists(uint256 gameId) {
        if (_games[gameId].creator == address(0)) revert GameNotFound();
        _;
    }

    modifier gameNotStarted(uint256 gameId) {
        if (_games[gameId].started) revert GameAlreadyStarted();
        _;
    }

    modifier gameStarted(uint256 gameId) {
        if (!_games[gameId].started) revert GameNotStarted();
        _;
    }

    modifier gameNotFinalized(uint256 gameId) {
        if (_games[gameId].finalized) revert GameAlreadyFinalized();
        _;
    }

    modifier onlyCreator(uint256 gameId) {
        if (_games[gameId].creator != msg.sender) revert OnlyCreatorCanStart();
        _;
    }

    modifier validPath(uint8 path) {
        if (path >= NUM_PATHS) revert InvalidPath();
        _;
    }

    /**
     * @notice Creates a new game room with specified entry fee
     * @param entryFee Entry fee for the game (minimum 2 MON)
     * @return gameId The ID of the created game
     */
    function createGame(uint256 entryFee) external returns (uint256 gameId) {
        if (entryFee < MIN_ENTRY_FEE) revert InsufficientEntryFee();
        
        gameId = ++_gameIdCounter;
        GameRoom storage game = _games[gameId];
        
        game.id = gameId;
        game.creator = msg.sender;
        game.entryFee = entryFee;
        
        emit GameCreated(gameId, msg.sender, entryFee);
    }

    /**
     * @notice Allows a player to join a game room
     * @param gameId The ID of the game to join
     * @param nickname Custom nickname (empty string uses defaults)
     * @param isThief Whether the player wants to be a thief (true) or police (false)
     */
    function joinGame(uint256 gameId, string memory nickname, bool isThief) 
        external 
        payable 
        gameExists(gameId) 
        gameNotStarted(gameId) 
    {
        GameRoom storage game = _games[gameId];
        
        if (msg.value != game.entryFee) revert InsufficientEntryFee();
        if (game.players.length >= MAX_PLAYERS) revert GameIsFull();
        
        // Check if player already joined
        for (uint256 i = 0; i < game.players.length; i++) {
            if (game.players[i].addr == msg.sender) revert PlayerAlreadyJoined();
        }
        
        // Check team balance
        if (isThief && game.thievesCount >= MAX_PLAYERS - MIN_POLICE) revert InvalidTeamSelection();
        if (!isThief && game.policeCount >= MAX_PLAYERS - MIN_THIEVES) revert InvalidTeamSelection();
        
        // Set nickname
        string memory finalNickname = nickname;
        if (bytes(nickname).length == 0) {
            if (isThief) {
                finalNickname = "John";
            } else {
                finalNickname = _policeNicknames[game.policeCount % _policeNicknames.length];
            }
        }
        
        // Add player to game
        Player memory newPlayer = Player({
            addr: msg.sender,
            nickname: finalNickname,
            isThief: isThief,
            eliminated: false,
            moves: [0, 0, 0, 0],
            hasCommittedMove: false
        });
        
        game.players.push(newPlayer);
        game.vault += msg.value;
        
        if (isThief) {
            game.thievesCount++;
            game.aliveThieves++;
        } else {
            game.policeCount++;
        }
        
        emit PlayerJoined(gameId, msg.sender, finalNickname, isThief);
    }

    /**
     * @notice Starts the game if minimum player requirements are met
     * @param gameId The ID of the game to start
     */
    function startGame(uint256 gameId) 
        external 
        gameExists(gameId) 
        gameNotStarted(gameId) 
        onlyCreator(gameId) 
    {
        GameRoom storage game = _games[gameId];
        
        if (game.thievesCount < MIN_THIEVES || game.policeCount < MIN_POLICE) {
            revert InsufficientPlayers();
        }
        
        game.started = true;
        game.startBlock = block.number;
        game.currentStage = 0;
        
        emit GameStarted(gameId, block.number);
    }

    /**
     * @notice Allows thieves to commit their path choice for the current stage
     * @param gameId The ID of the game
     * @param pathChoice The path to choose (0=A, 1=B, 2=C)
     */
    function commitMove(uint256 gameId, uint8 pathChoice) 
        external 
        gameExists(gameId) 
        gameStarted(gameId) 
        gameNotFinalized(gameId) 
        validPath(pathChoice) 
    {
        GameRoom storage game = _games[gameId];
        
        if (game.currentStage >= TOTAL_STAGES) revert InvalidStage();
        
        // Find player and verify they are a thief
        bool playerFound = false;
        uint256 playerIndex;
        
        for (uint256 i = 0; i < game.players.length; i++) {
            if (game.players[i].addr == msg.sender) {
                playerFound = true;
                playerIndex = i;
                break;
            }
        }
        
        if (!playerFound) revert PlayerNotInGame();
        if (!game.players[playerIndex].isThief) revert OnlyThievesCanCommitMoves();
        if (game.players[playerIndex].eliminated) revert PlayerEliminated();
        if (game.players[playerIndex].hasCommittedMove) revert MoveAlreadyCommitted();
        
        game.players[playerIndex].moves[game.currentStage] = pathChoice;
        game.players[playerIndex].hasCommittedMove = true;
        
        emit MoveCommitted(gameId, msg.sender, game.currentStage);
    }

    /**
     * @notice Allows police to vote on which path to block for the current stage
     * @param gameId The ID of the game
     * @param pathChoice The path to block (0=A, 1=B, 2=C)
     */
    function voteBlock(uint256 gameId, uint8 pathChoice) 
        external 
        gameExists(gameId) 
        gameStarted(gameId) 
        gameNotFinalized(gameId) 
        validPath(pathChoice) 
    {
        GameRoom storage game = _games[gameId];
        
        if (game.currentStage >= TOTAL_STAGES) revert InvalidStage();
        
        // Find player and verify they are police
        bool playerFound = false;
        
        for (uint256 i = 0; i < game.players.length; i++) {
            if (game.players[i].addr == msg.sender) {
                playerFound = true;
                if (game.players[i].isThief) revert OnlyPoliceCanVote();
                if (game.players[i].eliminated) revert PlayerEliminated();
                break;
            }
        }
        
        if (!playerFound) revert PlayerNotInGame();
        if (game.hasVoted[msg.sender]) revert VoteAlreadyCast();
        
        game.hasVoted[msg.sender] = true;
        game.policeVoteCount[pathChoice]++;
        
        // Update the blocked path to the one with most votes
        uint8 mostVotedPath = 0;
        uint256 maxVotes = game.policeVoteCount[0];
        
        for (uint8 i = 1; i < NUM_PATHS; i++) {
            if (game.policeVoteCount[i] > maxVotes) {
                maxVotes = game.policeVoteCount[i];
                mostVotedPath = i;
            }
        }
        
        game.policeVotes[game.currentStage] = mostVotedPath;
        
        emit VoteCast(gameId, msg.sender, game.currentStage, pathChoice);
    }

    /**
     * @notice Advances the game to the next stage and processes eliminations
     * @param gameId The ID of the game
     */
    function processStage(uint256 gameId) 
        external 
        gameExists(gameId) 
        gameStarted(gameId) 
        gameNotFinalized(gameId) 
    {
        GameRoom storage game = _games[gameId];
        
        if (game.currentStage >= TOTAL_STAGES) revert InvalidStage();
        
        uint8 blockedPath = game.policeVotes[game.currentStage];
        address[] memory eliminatedPlayers = new address[](game.aliveThieves);
        uint256 eliminatedCount = 0;
        
        // Process eliminations for thieves who chose the blocked path
        for (uint256 i = 0; i < game.players.length; i++) {
            Player storage player = game.players[i];
            if (player.isThief && !player.eliminated && player.hasCommittedMove) {
                if (player.moves[game.currentStage] == blockedPath) {
                    player.eliminated = true;
                    game.aliveThieves--;
                    eliminatedPlayers[eliminatedCount] = player.addr;
                    eliminatedCount++;
                }
            }
        }
        
        // Resize eliminated players array
        address[] memory finalEliminatedPlayers = new address[](eliminatedCount);
        for (uint256 i = 0; i < eliminatedCount; i++) {
            finalEliminatedPlayers[i] = eliminatedPlayers[i];
        }
        
        emit StageCompleted(gameId, game.currentStage, blockedPath, finalEliminatedPlayers);
        
        // Reset move commitments and votes for next stage
        for (uint256 i = 0; i < game.players.length; i++) {
            game.players[i].hasCommittedMove = false;
            game.hasVoted[game.players[i].addr] = false;
        }
        
        // Reset vote counts for next stage
        for (uint8 i = 0; i < NUM_PATHS; i++) {
            game.policeVoteCount[i] = 0;
        }
        
        game.currentStage++;
        
        // Check if game should end
        if (game.aliveThieves == 0 || game.currentStage >= TOTAL_STAGES) {
            _determineWinners(gameId);
        }
    }

    /**
     * @notice Finalizes the game and distributes prizes to winners
     * @param gameId The ID of the game to finalize
     */
    function finalizeGame(uint256 gameId) 
        external 
        gameExists(gameId) 
        gameStarted(gameId) 
        gameNotFinalized(gameId) 
        onlyCreator(gameId) 
    {
        GameRoom storage game = _games[gameId];
        
        if (game.currentStage < TOTAL_STAGES && game.aliveThieves > 0) {
            revert GameNotReadyToFinalize();
        }
        
        game.finalized = true;
        
        // Count winners and distribute prizes
        address[] memory gameWinners = new address[](game.players.length);
        uint256 winnerCount = 0;
        
        for (uint256 i = 0; i < game.players.length; i++) {
            if (game.winners[game.players[i].addr]) {
                gameWinners[winnerCount] = game.players[i].addr;
                winnerCount++;
            }
        }
        
        if (winnerCount > 0) {
            uint256 prizePerWinner = game.vault / winnerCount;
            
            for (uint256 i = 0; i < winnerCount; i++) {
                (bool success, ) = gameWinners[i].call{value: prizePerWinner}("");
                if (!success) revert TransferFailed();
                emit PrizeClaimed(gameId, gameWinners[i], prizePerWinner);
            }
            
            // Resize winners array for event
            address[] memory finalWinners = new address[](winnerCount);
            for (uint256 i = 0; i < winnerCount; i++) {
                finalWinners[i] = gameWinners[i];
            }
            
            emit GameFinalized(gameId, finalWinners, prizePerWinner);
        } else {
            // No winners, refund entry fees
            for (uint256 i = 0; i < game.players.length; i++) {
                (bool success, ) = game.players[i].addr.call{value: game.entryFee}("");
                if (!success) revert TransferFailed();
            }
            
            emit GameFinalized(gameId, new address[](0), 0);
        }
        
        game.vault = 0;
    }

    /**
     * @notice Determines the winners after all stages are complete
     * @param gameId The ID of the game
     */
    function _determineWinners(uint256 gameId) private {
        GameRoom storage game = _games[gameId];
        
        if (game.aliveThieves == 0) {
            // Police win if all thieves are eliminated
            for (uint256 i = 0; i < game.players.length; i++) {
                if (!game.players[i].isThief) {
                    game.winners[game.players[i].addr] = true;
                }
            }
        } else if (game.currentStage >= TOTAL_STAGES) {
            // Stage 4 completed - determine winning path and thieves
            uint8 winningPath = uint8(uint256(blockhash(game.startBlock)) % NUM_PATHS);
            uint8 blockedPath = game.policeVotes[TOTAL_STAGES - 1];
            
            for (uint256 i = 0; i < game.players.length; i++) {
                Player storage player = game.players[i];
                if (player.isThief && !player.eliminated) {
                    uint8 finalMove = player.moves[TOTAL_STAGES - 1];
                    if (finalMove == winningPath && finalMove != blockedPath) {
                        game.winners[player.addr] = true;
                    }
                }
            }
        }
    }

    // View functions

    /**
     * @notice Gets all players in a game
     * @param gameId The ID of the game
     * @return players Array of players in the game
     */
    function getPlayers(uint256 gameId) 
        external 
        view 
        gameExists(gameId) 
        returns (Player[] memory players) 
    {
        return _games[gameId].players;
    }

    /**
     * @notice Gets the current state of a game
     * @param gameId The ID of the game
     * @return creator The creator of the game
     * @return entryFee The entry fee for the game
     * @return started Whether the game has started
     * @return finalized Whether the game has been finalized
     * @return currentStage The current stage of the game
     * @return thievesCount The number of thieves in the game
     * @return policeCount The number of police in the game
     * @return aliveThieves The number of alive thieves
     * @return totalPlayers The total number of players
     */
    function getGameState(uint256 gameId) 
        external 
        view 
        gameExists(gameId) 
        returns (
            address creator,
            uint256 entryFee,
            bool started,
            bool finalized,
            uint256 currentStage,
            uint256 thievesCount,
            uint256 policeCount,
            uint256 aliveThieves,
            uint256 totalPlayers
        ) 
    {
        GameRoom storage game = _games[gameId];
        return (
            game.creator,
            game.entryFee,
            game.started,
            game.finalized,
            game.currentStage,
            game.thievesCount,
            game.policeCount,
            game.aliveThieves,
            game.players.length
        );
    }

    /**
     * @notice Gets the vault balance for a game
     * @param gameId The ID of the game
     * @return vault The current vault balance
     */
    function getVaultBalance(uint256 gameId) 
        external 
        view 
        gameExists(gameId) 
        returns (uint256 vault) 
    {
        return _games[gameId].vault;
    }

    /**
     * @notice Gets the police votes for a specific stage
     * @param gameId The ID of the game
     * @param stage The stage number
     * @return blockedPath The path that was blocked by police vote
     */
    function getPoliceVote(uint256 gameId, uint256 stage) 
        external 
        view 
        gameExists(gameId) 
        returns (uint8 blockedPath) 
    {
        return _games[gameId].policeVotes[stage];
    }

    /**
     * @notice Checks if a player is a winner
     * @param gameId The ID of the game
     * @param player The player address to check
     * @return winner Whether the player is a winner
     */
    function isWinner(uint256 gameId, address player) 
        external 
        view 
        gameExists(gameId) 
        returns (bool winner) 
    {
        return _games[gameId].winners[player];
    }

    /**
     * @notice Gets the current game ID counter
     * @return Current game ID counter
     */
    function getCurrentGameId() external view returns (uint256) {
        return _gameIdCounter;
    }
} 