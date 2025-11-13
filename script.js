// --- Game Setup ---
// Wait for the HTML to be fully loaded before running any code
document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById('gameCanvas');
    
    if (!canvas) {
        console.error("CRITICAL ERROR: Cannot find <canvas id='gameCanvas'>. Check for HTML typos.");
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- Tile System ---
    const TILE_SIZE = 20; // 20x20 pixel tiles
    const DEBUG_DRAW_GRID = false; // Set to true to see the grid!
    
    // --- Pathfinding Waypoints ---
    const bridgeTop = { x: 300, y: 85 };
    const bridgeBottom = { x: 300, y: 235 };

    // --- Get All Modals and Buttons ---
    const introModal = document.getElementById('intro-modal');
    const startBuildButton = document.getElementById('start-build-button');
    const deckBuilderModal = document.getElementById('deck-builder-modal');
    const cardCollectionContainer = document.getElementById('card-collection');
    const deckCounter = document.getElementById('deck-counter');
    const confirmDeckButton = document.getElementById('confirm-deck-button');
    const difficultyModal = document.getElementById('difficulty-modal');
    const difficultyButtons = document.querySelectorAll('#difficulty-select button');
    const gameContainer = document.getElementById('game-container');
    const handContainer = document.getElementById('hand-container');
    
    // --- Deck Builder Buttons ---
    const averageCostDisplay = document.getElementById('average-cost-display');
    const randomizeDeckButton = document.getElementById('randomize-deck-button');
    
    // --- Stat Display Panel ---
    const statDisplay = document.getElementById('stat-display');
    
    // --- Replay Button ---
    const replayButton = document.getElementById('replay-button');
    
    // --- Coin Counter ---
    const coinCounterDisplay = document.getElementById('coin-counter');
    
    // Difficulty Settings
    let enemySpawnRate = 6500; 
    let enemySpawnCount = 1; 
    let enemySpawnInterval = null; 
    let enemyLevel = 1; // NEW: Enemy level
    let coinMultiplier = 1.0; // NEW: Coin reward multiplier
    
    // --- NEW: Saved Deck Slots ---
    const savedDeckSlotsContainer = document.getElementById('saved-deck-slots');

    // Game Arrays
    const units = []; 
    const buildings = []; 
    const projectiles = []; 
    const spellProjectiles = []; 
    const spellEffects = []; 
    const spellAreas = []; 
    const deathBombs = []; 
    
    let playerElixir = 5;
    const maxElixir = 10;
    
    // Elixir Rate Management
    const baseElixirRate = 1 / 120; // 1 per 2 seconds
    let currentElixirRate = baseElixirRate; 
    
    let activeCardType = null; 
    let activeCardSlot = -1; 

    // Game State and Timer
    let gameState = 'running'; 
    let matchTime = 180; 
    let gameTime = 0; 
    let elixirMessage = ""; 
    let elixirMessageTime = 0;

    // Crown Counters
    let playerCrowns = 0;
    let enemyCrowns = 0;

    // Deck and Hand Management
    let playerDeck = []; // The 8 cards the player *takes into battle*
    let enemyDeck = []; 
    let fullDeck = []; 
    let drawPile = [];
    let hand = [null, null, null, null]; // 4 slots
    let discardPile = [];
    
    // DOM Elements
    const elixirLevelDisplay = document.getElementById('elixir-level');
    const elixirTextDisplay = document.getElementById('elixir-text');
    const playerCrownsDisplay = document.getElementById('player-crowns');
    const enemyCrownsDisplay = document.getElementById('enemy-crowns');
    const timerDisplay = document.getElementById('timer-display');
    const handSlots = [
        document.getElementById('slot-0'),
        document.getElementById('slot-1'),
        document.getElementById('slot-2'),
        document.getElementById('slot-3')
    ];
    
    // --- Hover/Highlight Elements ---
    const hoverSymbol = document.getElementById('hover-symbol');
    let mouseCanvasX = -100;
    let mouseCanvasY = -100;

    // --- NEW: Leveling System ---
    
    // The "save file" for the player
    let playerProgress = {
        coins: 0,
        kingTowerLevel: 1,
        cardLevels: {}, // e.g., {'knight': 1, 'pekka': 1}
        savedDeck: [null, null, null, null, null, null, null, null] // --- NEW: 8-slot saved deck
    };
    
    // The "database" of level-up costs
    const LEVEL_UP_COSTS = {
        // level -> cost to upgrade to next level
        1: 5, 2: 20, 3: 50, 4: 150, 5: 400, 6: 1000, 7: 2000,
        8: 4000, 9: 8000, 10: 15000, 11: 25000, 12: 50000, 13: 100000, 14: 0 
    };
    
    // --- NEW: Base coin reward, multiplier is applied ---
    const BASE_COIN_REWARD = 50;

    // --- MASTER CARD LIST (ALL LEVEL 1 STATS) ---
    // --- RANGES AND SPEEDS HALVED/REDUCED ---
    const MASTER_CARD_LIST = {
        // --- TROOPS ---
        knight: { type: 'troop', name: 'Knight', icon: '🤺', size: 28, hp: 660, dmg: 78, speed: 0.5, range: 10, attackSpeed: 1.2, cost: 3, canTargetAir: false, isFlying: false, displayName: 'Knight', deployTime: 60 },
        archer: { type: 'troop', name: 'Archer', icon: '🏹', size: 22, hp: 116, dmg: 40, speed: 0.5, range: 90, attackSpeed: 1.2, cost: 3, isRanged: true, projectileType: 'arrow', canTargetAir: true, isFlying: false, displayName: 'Archers (x2)', deployTime: 60 },
        giant: { type: 'troop', name: 'Giant', icon: '🏋️', size: 35, hp: 1500, dmg: 96, speed: 0.3, range: 10, attackSpeed: 1.5, cost: 5, canTargetAir: false, isFlying: false, displayName: 'Giant', deployTime: 60, targets: 'buildings' },
        mini_pekka: { type: 'troop', name: 'Mini P.E.K.K.A', icon: '🤖', size: 25, hp: 440, dmg: 238, speed: 0.7, range: 10, attackSpeed: 1.8, cost: 4, canTargetAir: false, isFlying: false, displayName: 'Mini P.E.K.K.A', deployTime: 60 },
        baby_dragon: { type: 'troop', name: 'Baby Dragon', icon: '🐉', size: 35, hp: 425, dmg: 60, speed: 0.7, range: 72, attackSpeed: 1.5, cost: 4, isRanged: true, projectileType: 'fireball', isSplash: true, splashRadius: 30, canTargetAir: true, isFlying: true, displayName: 'Baby Dragon', deployTime: 60 },
        skeleton: { type: 'troop', name: 'Skeleton', icon: '💀', size: 18, hp: 33, dmg: 33, speed: 0.7, range: 10, attackSpeed: 1.0, cost: 1, canTargetAir: false, isFlying: false, displayName: 'Skeletons (x3)', deployTime: 60 },
        witch: { type: 'troop', name: 'Witch', icon: '🧙', size: 28, hp: 320, dmg: 51, speed: 0.5, range: 78, attackSpeed: 1.1, cost: 5, isRanged: true, projectileType: 'magic', isSplash: true, splashRadius: 20, canTargetAir: true, isFlying: false, lastSpawnTime: 0, spawnRate: 420, displayName: 'Witch', deployTime: 60 }, // 7s spawn
        barbarians: { type: 'troop', name: 'Barbarians', icon: '⚔️', size: 26, hp: 161, dmg: 50, speed: 0.5, range: 10, attackSpeed: 1.4, cost: 5, canTargetAir: false, isFlying: false, displayName: 'Barbarians (x5)', deployTime: 60 },
        golem: { type: 'troop', name: 'Golem', icon: '🪨', size: 40, hp: 1943, dmg: 118, speed: 0.3, range: 10, attackSpeed: 2.5, cost: 8, canTargetAir: false, isFlying: false, displayName: 'Golem', deployTime: 60, deathSpawn: 'golemite', targets: 'buildings' },
        ice_spirit: { type: 'troop', name: 'Ice Spirit', icon: '❄️', size: 20, hp: 87, dmg: 39, speed: 0.9, range: 10, attackSpeed: 0.5, cost: 1, freezeFrames: 78, canTargetAir: true, isFlying: false, displayName: 'Ice Spirit', deployTime: 60 },
        spear_goblins: { type: 'troop', name: 'Spear Goblins', icon: '👺', size: 20, hp: 55, dmg: 33, speed: 0.9, range: 90, attackSpeed: 1.1, cost: 2, isRanged: true, projectileType: 'arrow', canTargetAir: true, isFlying: false, displayName: 'Spear Goblins (x3)', deployTime: 60 },
        ice_wizard: { type: 'troop', name: 'Ice Wizard', icon: '🥶', size: 28, hp: 292, dmg: 46, speed: 0.5, range: 99, attackSpeed: 1.7, cost: 3, isRanged: true, projectileType: 'ice', isSplash: true, splashRadius: 25, canTargetAir: true, isFlying: false, displayName: 'Ice Wizard', deployTime: 60, slowFrames: 150 }, // 2.5s slow
        zappies: { type: 'troop', name: 'Zappies', icon: '🔋', size: 22, hp: 132, dmg: 35, speed: 0.5, range: 81, attackSpeed: 1.6, cost: 4, isRanged: true, projectileType: 'zap', canTargetAir: true, isFlying: false, displayName: 'Zappies (x3)', deployTime: 60, stunFrames: 30 }, // 0.5s stun
        giant_skeleton: { type: 'troop', name: 'Giant Skeleton', icon: '☠️', size: 38, hp: 1205, dmg: 77, speed: 0.5, range: 10, attackSpeed: 1.5, cost: 6, canTargetAir: false, isFlying: false, displayName: 'Giant Skeleton', deployTime: 60, deathBombStats: { damage: 440, aoeRadius: 100, timer: 180 } }, // 3s bomb timer
        bats: { type: 'troop', name: 'Bats', icon: '🦇', size: 18, hp: 33, dmg: 33, speed: 0.7, range: 10, attackSpeed: 1.0, cost: 2, canTargetAir: true, isFlying: true, displayName: 'Bats (x5)', deployTime: 60 },
        goblins: { type: 'troop', name: 'Goblins', icon: '🟢', size: 20, hp: 79, dmg: 49, speed: 0.9, range: 10, attackSpeed: 1.1, cost: 2, canTargetAir: false, isFlying: false, displayName: 'Goblins (x3)', deployTime: 60 },
        minions: { type: 'troop', name: 'Minions', icon: '👿', size: 24, hp: 89, dmg: 41, speed: 0.7, range: 10, attackSpeed: 1.0, cost: 3, canTargetAir: true, isFlying: true, displayName: 'Minions (x3)', deployTime: 60 },
        minion_horde: { type: 'troop', name: 'Minion Horde', icon: '👿👿', size: 24, hp: 89, dmg: 41, speed: 0.7, range: 10, attackSpeed: 1.0, cost: 5, canTargetAir: true, isFlying: true, displayName: 'Minion Horde (x6)', deployTime: 60, spawnUnit: 'minion_unit' },
        royal_giant: { type: 'troop', name: 'Royal Giant', icon: '👑🏋️', size: 35, hp: 1160, dmg: 113, speed: 0.3, range: 117, attackSpeed: 1.7, cost: 6, isRanged: true, projectileType: 'cannonball', canTargetAir: false, isFlying: false, displayName: 'Royal Giant', deployTime: 60, targets: 'buildings' },
        elite_barbarians: { type: 'troop', name: 'Elite Barbarians', icon: '💨⚔️', size: 28, hp: 462, dmg: 138, speed: 0.9, range: 10, attackSpeed: 1.7, cost: 6, canTargetAir: false, isFlying: false, displayName: 'E-Barbs (x2)', deployTime: 60 },
        valkyrie: { type: 'troop', name: 'Valkyrie', icon: '👩‍🦰', size: 28, hp: 737, dmg: 110, speed: 0.5, range: 10, attackSpeed: 1.5, cost: 4, canTargetAir: false, isFlying: false, displayName: 'Valkyrie', deployTime: 60, isSplash: true },
        pekka: { type: 'troop', name: 'P.E.K.K.A', icon: '🦾', size: 40, hp: 1424, dmg: 310, speed: 0.3, range: 10, attackSpeed: 1.8, cost: 7, canTargetAir: false, isFlying: false, displayName: 'P.E.K.K.A', deployTime: 60 },
        bowler: { type: 'troop', name: 'Bowler', icon: '🟣', size: 35, hp: 717, dmg: 108, speed: 0.3, range: 81, attackSpeed: 2.5, cost: 5, isRanged: true, projectileType: 'boulder', canTargetAir: false, isFlying: false, displayName: 'Bowler', deployTime: 60 },
        magic_archer: { type: 'troop', name: 'Magic Archer', icon: '🪄', size: 26, hp: 221, dmg: 46, speed: 0.5, range: 117, attackSpeed: 1.1, cost: 4, isRanged: true, projectileType: 'piercing_arrow', canTargetAir: true, isFlying: false, displayName: 'Magic Archer', deployTime: 60 },
        miner: { type: 'troop', name: 'Miner', icon: '👷', size: 28, hp: 456, dmg: 58, towerDamage: 20, speed: 0.9, range: 10, attackSpeed: 1.2, cost: 3, canTargetAir: false, isFlying: false, displayName: 'Miner', deployTime: 60, deployAnywhere: true, targets: 'buildings' },
        cannon_cart: { type: 'troop', name: 'Cannon Cart', icon: '🛒', size: 30, hp: 315, shieldHp: 315, dmg: 123, speed: 0.5, range: 99, attackSpeed: 1.2, cost: 5, isRanged: true, projectileType: 'cannonball', canTargetAir: false, isFlying: false, displayName: 'Cannon Cart', deployTime: 60, transformOnShieldBreak: 'cannon_cart_building' },
        musketeer: { type: 'troop', name: 'Musketeer', icon: '👩‍🚀', size: 28, hp: 292, dmg: 90, speed: 0.5, range: 108, attackSpeed: 1.1, cost: 4, isRanged: true, projectileType: 'bullet', canTargetAir: true, isFlying: false, displayName: 'Musketeer', deployTime: 60 },
        wizard: { type: 'troop', name: 'Wizard', icon: '🔥🧙', size: 28, hp: 292, dmg: 112, speed: 0.5, range: 99, attackSpeed: 1.4, cost: 5, isRanged: true, projectileType: 'fireball', isSplash: true, splashRadius: 35, canTargetAir: true, isFlying: false, displayName: 'Wizard', deployTime: 60 },
        bomber: { type: 'troop', name: 'Bomber', icon: '💣💀', size: 24, hp: 137, dmg: 139, speed: 0.5, range: 81, attackSpeed: 1.9, cost: 2, isRanged: true, projectileType: 'bomb', isSplash: true, splashRadius: 30, canTargetAir: false, isFlying: false, displayName: 'Bomber', deployTime: 60 },
        dart_goblin: { type: 'troop', name: 'Dart Goblin', icon: '🎯👺', size: 24, hp: 107, dmg: 50, speed: 0.9, range: 117, attackSpeed: 0.7, cost: 3, isRanged: true, projectileType: 'dart', canTargetAir: true, isFlying: false, displayName: 'Dart Goblin', deployTime: 60 },
        balloon: { type: 'troop', name: 'Balloon', icon: '🎈', size: 35, hp: 580, dmg: 331, speed: 0.5, range: 10, attackSpeed: 3.0, cost: 5, canTargetAir: true, isFlying: true, displayName: 'Balloon', deployTime: 60, targets: 'buildings', deathBombStats: { damage: 183, aoeRadius: 60, timer: 60 } }, // 1s bomb timer
        
        // --- SPELLS (6) ---
        zap: { type: 'spell', name: 'Zap', icon: '⚡', cost: 2, displayName: 'Zap', aoeRadius: 40, damage: 72, stunFrames: 30, travelTime: 0 }, // 0.5s stun
        snowball: { type: 'spell', name: 'Snowball', icon: '⚪', cost: 2, displayName: 'Snowball', aoeRadius: 40, damage: 44, knockback: 30, travelTime: 0 },
        fireball: { type: 'spell', name: 'Fireball', icon: '🔥', cost: 4, displayName: 'Fireball', aoeRadius: 50, damage: 258, travelTime: 50 },
        rocket: { type: 'spell', name: 'Rocket', icon: '🚀', cost: 6, displayName: 'Rocket', aoeRadius: 40, damage: 572, travelTime: 100 },
        earthquake: { type: 'spell', name: 'Earthquake', icon: '💥', cost: 3, displayName: 'Earthquake', aoeRadius: 70, duration: 180, troopDmgPerFrame: 0.33, buildingDmgPerFrame: 1.33, travelTime: 0 }, // 60 / 180, 240 / 180
        freeze: { type: 'spell', name: 'Freeze', icon: '🥶', cost: 4, displayName: 'Freeze', aoeRadius: 60, damage: 0, freezeFrames: 270, travelTime: 0 }, // 4.5s freeze

        // --- BUILDINGS (4) ---
        goblin_hut: { type: 'building', name: 'Goblin Hut', icon: '🛖', size: 40, hp: 536, cost: 5, displayName: 'Goblin Hut', deployTime: 60, lifetime: 1740, spawnRate: 240, spawnCount: 1, spawnType: 'spear_goblin_unit', isAttacker: false }, // 29s life, 4s spawn
        cannon: { type: 'building', name: 'Cannon', icon: '💣', size: 40, hp: 286, dmg: 59, attackSpeed: 0.8, range: 99, cost: 3, displayName: 'Cannon', deployTime: 60, lifetime: 1800, canTargetAir: false, isAttacker: true }, // 30s life
        tombstone: { type: 'building', name: 'Tombstone', icon: '🪦', size: 40, hp: 192, cost: 3, displayName: 'Tombstone', deployTime: 60, lifetime: 2400, spawnRate: 174, spawnCount: 1, spawnType: 'skeleton_unit', isAttacker: false, deathSpawn: 'skeleton_unit', deathSpawnCount: 4 }, // 40s life, 2.9s spawn
        barbarian_hut: { type: 'building', name: 'Barbarian Hut', icon: '🏠', size: 40, hp: 602, cost: 7, displayName: 'Barbarian Hut', deployTime: 60, lifetime: 3000, spawnRate: 780, spawnCount: 2, spawnType: 'barbarian_unit', isAttacker: false }, // 50s life, 13s spawn
        
        // --- HIDDEN UNITS (for spawning) ---
        golemite: { type: 'troop_hidden', name: 'Golemite', icon: '🗿', size: 30, hp: 393, dmg: 23, speed: 0.3, range: 10, attackSpeed: 2.5, cost: 0, canTargetAir: false, isFlying: false, deployTime: 0, targets: 'buildings' },
        spear_goblin_unit: { type: 'troop_hidden', name: 'Spear Goblins', icon: '👺', size: 20, hp: 55, dmg: 33, speed: 0.9, range: 90, attackSpeed: 1.1, cost: 0, isRanged: true, projectileType: 'arrow', canTargetAir: true, isFlying: false, deployTime: 60 },
        skeleton_unit: { type: 'troop_hidden', name: 'Skeleton', icon: '💀', size: 18, hp: 33, dmg: 33, speed: 0.7, range: 10, attackSpeed: 1.0, cost: 0, canTargetAir: false, isFlying: false, deployTime: 60 },
        minion_unit: { type: 'troop_hidden', name: 'Minions', icon: '👿', size: 24, hp: 89, dmg: 41, speed: 0.7, range: 10, attackSpeed: 1.0, cost: 0, canTargetAir: true, isFlying: true, deployTime: 60 },
        barbarian_unit: { type: 'troop_hidden', name: 'Barbarians', icon: '⚔️', size: 26, hp: 161, dmg: 50, speed: 0.5, range: 10, attackSpeed: 1.4, cost: 0, canTargetAir: false, isFlying: false, deployTime: 60 },
        cannon_cart_building: { type: 'building_hidden', name: 'Cannon Cart (Building)', icon: '🛒', size: 30, hp: 315, dmg: 123, attackSpeed: 1.2, range: 99, cost: 0, lifetime: 99999, canTargetAir: false, isAttacker: true, deployTime: 0 },
    };
    const STATS = MASTER_CARD_LIST; // Alias for simplicity
    
    // --- NEW: Tower Level 1 Stats (Ranges Reduced) ---
    const TOWER_STATS = {
        princess: { hp: 1050, dmg: 46, attackSpeed: 0.8, range: 120 },
        king: { hp: 1662, dmg: 41, attackSpeed: 1.0, range: 108 }
    };

    // --- NEW: Stat Calculator ---
    // Calculates stats based on level. (Uses a 10% increase per level, simplified)
    function calculateStats(baseStats, level) {
        const newStats = { ...baseStats }; // Clone
        const multiplier = Math.pow(1.1, level - 1);
        
        if (newStats.hp) newStats.hp = Math.round(newStats.hp * multiplier);
        if (newStats.dmg) newStats.dmg = Math.round(newStats.dmg * multiplier);
        if (newStats.towerDamage) newStats.towerDamage = Math.round(newStats.towerDamage * multiplier);
        if (newStats.shieldHp) newStats.shieldHp = Math.round(newStats.shieldHp * multiplier);
        if (newStats.damage) newStats.damage = Math.round(newStats.damage * multiplier);
        
        if (newStats.deathBombStats) {
            newStats.deathBombStats = { ...newStats.deathBombStats };
            newStats.deathBombStats.damage = Math.round(newStats.deathBombStats.damage * multiplier);
        }
        if (newStats.troopDmgPerFrame) newStats.troopDmgPerFrame *= multiplier;
        if (newStats.buildingDmgPerFrame) newStats.buildingDmgPerFrame *= multiplier;

        return newStats;
    }
    
    // --- NEW: Save/Load System ---
    function saveProgress() {
        localStorage.setItem('clashSimProgress', JSON.stringify(playerProgress));
    }
    
    function loadProgress() {
        const savedData = localStorage.getItem('clashSimProgress');
        if (savedData) {
            playerProgress = JSON.parse(savedData);
            
            // --- IMPORTANT: Add new cards/deck to an old save file ---
            playerProgress.savedDeck = playerProgress.savedDeck || [null, null, null, null, null, null, null, null];
            if (playerProgress.savedDeck.length !== 8) { // Fix old save files
                 playerProgress.savedDeck = [null, null, null, null, null, null, null, null];
            }
            playerProgress.cardLevels = playerProgress.cardLevels || {};
            
            for (const cardType in MASTER_CARD_LIST) {
                if (!playerProgress.cardLevels[cardType]) {
                    playerProgress.cardLevels[cardType] = 1;
                }
            }
        } else {
            // No save file, create one
            playerProgress.coins = 100; // Start with 100 coins
            for (const cardType in MASTER_CARD_LIST) {
                playerProgress.cardLevels[cardType] = 1;
            }
            saveProgress();
        }
        
        // --- NEW: Update coin counter UI ---
        if (coinCounterDisplay) {
            coinCounterDisplay.textContent = `Coins: ${playerProgress.coins}`;
        }
    }

    
    // --- Deck Builder Logic (HEAVILY REVISED) ---
    function initializeDeckBuilder() {
        cardCollectionContainer.innerHTML = ''; // Clear previous
        
        // Create all cards in the collection
        for (const cardType in MASTER_CARD_LIST) {
            const stats = MASTER_CARD_LIST[cardType];
            if (stats.type === 'troop_hidden' || stats.type === 'building_hidden') continue;
            
            const card = document.createElement('div');
            card.classList.add('deck-builder-card');
            card.dataset.card = cardType;
            card.setAttribute('draggable', true); // --- NEW: Make draggable
            
            card.innerHTML = `
                <div class="card-cost">${stats.cost}</div>
                <div class="card-icon">${stats.icon}</div>
                <div class="card-name">${stats.displayName}</div>
            `;
            
            // --- NEW: Click to show stats, Drag to build deck ---
            card.addEventListener('click', () => showCardStats(cardType));
            card.addEventListener('dragstart', (e) => handleDragStart(e, cardType));
            
            cardCollectionContainer.appendChild(card);
        }
        
        // Create the 8 empty deck slots
        savedDeckSlotsContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const slot = document.createElement('div');
            slot.classList.add('deck-card-slot');
            slot.dataset.index = i;
            
            // --- NEW: Add drag/drop listeners ---
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', (e) => handleDrop(e, i));
            slot.addEventListener('click', () => removeCardFromDeck(i)); // Click to remove
            
            savedDeckSlotsContainer.appendChild(slot);
        }
        
        // --- NEW: Load saved deck into logic and UI ---
        playerDeck = [...playerProgress.savedDeck]; // Sync playerDeck with the loaded progress
        updateSavedDeckUI();
        updateDeckBuilderCounters();
    }
    
    // --- NEW: Drag and Drop Functions ---
    function handleDragStart(event, cardType) {
        event.dataTransfer.setData('text/plain', cardType);
    }
    
    function handleDragOver(event) {
        event.preventDefault(); // Allow dropping
    }
    
    function handleDrop(event, slotIndex) {
        event.preventDefault();
        const cardType = event.dataTransfer.getData('text/plain');
        
        if (cardType && MASTER_CARD_LIST[cardType]) {
            // Check if card is already in the deck
            if (playerDeck.includes(cardType)) { // <-- FIX: Check playerDeck
                alert("Card is already in your deck!");
                return;
            }
            
            // Add card to the deck
            playerProgress.savedDeck[slotIndex] = cardType;
            playerDeck[slotIndex] = cardType; // <-- FIX: Add this line
            updateSavedDeckUI();
            updateDeckBuilderCounters();
        }
    }
    
    // --- NEW: Remove card from deck ---
    function removeCardFromDeck(slotIndex) {
        if (playerProgress.savedDeck[slotIndex]) {
            playerProgress.savedDeck[slotIndex] = null;
            playerDeck[slotIndex] = null; // <-- FIX: Add this line
            updateSavedDeckUI();
            updateDeckBuilderCounters();
        }
    }

    // --- NEW: Redraws the 8-card deck UI ---
    function updateSavedDeckUI() {
        for (let i = 0; i < 8; i++) {
            const slot = savedDeckSlotsContainer.children[i];
            const cardType = playerProgress.savedDeck[i];
            
            if (cardType) {
                const stats = MASTER_CARD_LIST[cardType];
                slot.innerHTML = `
                    <div class="card-cost">${stats.cost}</div>
                    <div class="card-icon" style="font-size: 28px;">${stats.icon}</div>
                    <div class="card-name" style="font-size: 9px;">${stats.displayName}</div>
                `;
                slot.classList.add('filled');
            } else {
                slot.innerHTML = '';
                slot.classList.remove('filled');
            }
        }
    }
    
    function updateDeckBuilderCounters() {
        // --- NEW: Count non-null cards ---
        const cardCount = playerProgress.savedDeck.filter(card => card !== null).length;
        
        // Update count
        deckCounter.textContent = `Your Deck (${cardCount} / 8)`;
        confirmDeckButton.disabled = (cardCount !== 8);

        // Update average cost
        let totalCost = 0;
        for (const cardType of playerProgress.savedDeck) {
            if (cardType) {
                totalCost += MASTER_CARD_LIST[cardType].cost;
            }
        }
        const averageCost = (cardCount > 0) ? (totalCost / cardCount).toFixed(1) : 0.0;
        averageCostDisplay.textContent = `Average Cost: ${averageCost}`;
    }

    // --- MODIFIED: Stat Display Functions ---
    function showCardStats(cardType) {
        const currentLevel = playerProgress.cardLevels[cardType] || 1;
        const stats = calculateStats(MASTER_CARD_LIST[cardType], currentLevel);
        const costToUpgrade = LEVEL_UP_COSTS[currentLevel] || 0;
        
        let html = `<h2>${stats.displayName} (Level ${currentLevel})</h2>`;
        html += `<p><span class="stat-name">Cost:</span> ${stats.cost}</p>`;
        html += `<p><span class="stat-name">Type:</span> ${stats.type.toUpperCase()}</p>`;
        
        if (stats.type === 'troop') {
            if (stats.shieldHp) html += `<p><span class="stat-name">Shield HP:</span> ${stats.shieldHp}</p>`;
            html += `<p><span class="stat-name">HP:</span> ${stats.hp}</p>`;
            html += `<p><span class="stat-name">Damage:</span> ${stats.dmg}</p>`;
            if (stats.towerDamage) html += `<p><span class="stat-name">Tower Damage:</span> ${stats.towerDamage}</p>`;
            html += `<p><span class="stat-name">Speed:</span> ${stats.speed}</p>`;
            html += `<p><span class="stat-name">Attack Speed:</span> ${stats.attackSpeed}s</p>`;
            if (stats.targets === 'buildings') html += `<p><span class="stat-name">Targets:</span> Buildings</p>`;
        } else if (stats.type === 'building') {
            html += `<p><span class="stat-name">HP:</span> ${stats.hp}</p>`;
            html += `<p><span class="stat-name">Lifetime:</span> ${(stats.lifetime / 60).toFixed(1)}s</p>`;
            if(stats.isAttacker) {
                 html += `<p><span class="stat-name">Damage:</span> ${stats.dmg}</p>`;
                 html += `<p><span class="stat-name">Attack Speed:</span> ${stats.attackSpeed}s</p>`;
            }
            if (stats.spawnType) html += `<p><span class="stat-name">Spawn Speed:</span> ${(stats.spawnRate / 60).toFixed(1)}s</p>`;
        } else if (stats.type === 'spell') {
            if (stats.damage) html += `<p><span class="stat-name">Damage:</span> ${stats.damage}</p>`;
            if (stats.stunFrames) html += `<p><span class="stat-name">Stun:</span> ${stats.stunFrames / 60}s</p>`;
            if (stats.freezeFrames) html += `<p><span class="stat-name">Freeze:</span> ${stats.freezeFrames / 60}s</p>`;
            if (stats.duration) html += `<p><span class="stat-name">Duration:</span> ${stats.duration / 60}s</p>`;
            if (stats.troopDmgPerFrame) html += `<p><span class="stat-name">Troop DPS:</span> ${(stats.troopDmgPerFrame * 60).toFixed(0)}</p>`;
            if (stats.buildingDmgPerFrame) html += `<p><span class="stat-name">Tower DPS:</span> ${(stats.buildingDmgPerFrame * 60).toFixed(0)}</p>`;
        }
        
        if (stats.deathSpawn) html += `<p><span class="stat-name">Death Spawn:</span> ${stats.deathSpawnCount || '2'}x ${stats.deathSpawn}</p>`;
        if (stats.deathBombStats) html += `<p><span class="stat-name">Death Bomb:</span> ${stats.deathBombStats.damage} dmg</p>`;
        if (stats.slowFrames) html += `<p><span class="stat-name">Slows:</span> 35% for ${stats.slowFrames / 60}s</p>`;

        // --- NEW: Level Up UI ---
        html += `<hr><p><span class="stat-name">Your Coins:</span> ${playerProgress.coins}</p>`;
        if (currentLevel < 14) {
            html += `<p><span class="stat-name">Upgrade Cost:</span> ${costToUpgrade}</p>`;
            const canAfford = playerProgress.coins >= costToUpgrade;
            html += `<button class="modal-button" id="level-up-btn" data-card="${cardType}" ${!canAfford ? 'disabled' : ''}>
                Level Up
            </button>`;
        } else {
            html += `<p><span class="stat-name">Status:</span> MAX LEVEL</p>`;
        }

        statDisplay.innerHTML = html;
        
        // Add listener to the new button
        const levelUpBtn = document.getElementById('level-up-btn');
        if (levelUpBtn) {
            levelUpBtn.addEventListener('click', () => {
                const cardToUpgrade = levelUpBtn.dataset.card;
                const currentLevel = playerProgress.cardLevels[cardToUpgrade];
                const cost = LEVEL_UP_COSTS[currentLevel];
                
                if (playerProgress.coins >= cost) {
                    playerProgress.coins -= cost;
                    playerProgress.cardLevels[cardToUpgrade]++;
                    saveProgress();
                    showCardStats(cardToUpgrade); // Refresh the panel
                    coinCounterDisplay.textContent = `Coins: ${playerProgress.coins}`; // Update main counter
                }
            });
        }
    }

    function clearCardStats() {
        statDisplay.innerHTML = `
            <h2>Card Stats</h2>
            <p>Click a card to see its stats or upgrade it.</p>
            <hr>
            <p><span class="stat-name">Your Coins:</span> ${playerProgress.coins}</p>
            <p><span class="stat-name">King Level:</span> ${playerProgress.kingTowerLevel}</p>
            <p><span class="stat-name">Upgrade Cost:</span> ${LEVEL_UP_COSTS[playerProgress.kingTowerLevel] || 0}</p>
            <button class="modal-button" id="level-up-king-btn" ${playerProgress.coins < LEVEL_UP_COSTS[playerProgress.kingTowerLevel] ? 'disabled' : ''}>Level Up King</button>
        `;
        
        // --- NEW: Update coin counter ---
        coinCounterDisplay.textContent = `Coins: ${playerProgress.coins}`;
        
        // Add listener for king tower level up
        const levelUpKingBtn = document.getElementById('level-up-king-btn');
        if (levelUpKingBtn) {
            levelUpKingBtn.addEventListener('click', () => {
                const cost = LEVEL_UP_COSTS[playerProgress.kingTowerLevel];
                if (playerProgress.coins >= cost) {
                    playerProgress.coins -= cost;
                    playerProgress.kingTowerLevel++;
                    saveProgress();
                    clearCardStats(); // Refresh the panel
                }
            });
        }
    }
    // ---------------------------------

    // --- Helper function to shuffle an array ---
    function shuffleDeck(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Function to draw a card ---
    function drawCard() {
        if (drawPile.length === 0) {
            drawPile = shuffleDeck([...discardPile]); 
            discardPile = []; 
        }
        const emptySlot = hand.indexOf(null);
        if (emptySlot !== -1 && drawPile.length > 0) {
            const newCard = drawPile.pop(); 
            hand[emptySlot] = newCard; 
            updateHandUICard(emptySlot); 
        }
    }
    
    // --- Function to play a card ---
    function playCard(slotIndex) {
        const cardType = hand[slotIndex];
        discardPile.push(cardType); 
        hand[slotIndex] = null; 
        
        const slot = handSlots[slotIndex];
        slot.innerHTML = '';
        slot.classList.add('disabled');
        
        drawCard(); 
    }

    // --- Function to update a *single* card slot ---
    function updateHandUICard(i) {
        const cardType = hand[i];
        const slot = handSlots[i];
            
        if (cardType) {
            const stats = MASTER_CARD_LIST[cardType];
            slot.innerHTML = `
                <div class="card-cost">${stats.cost}</div>
                <div class="card-icon">${stats.icon}</div>
                <div class="card-name">${stats.displayName}</div>
            `;
            slot.dataset.card = cardType; 
            slot.dataset.slot = i; 
        } else {
            slot.innerHTML = '';
        }
    }
    
    // --- Function to check elixir *without* rebuilding HTML ---
    function updateHandElixirState() {
        for (let i = 0; i < handSlots.length; i++) {
            const cardType = hand[i];
            const slot = handSlots[i];
            
            if (cardType) {
                const stats = MASTER_CARD_LIST[cardType]; // Cost never changes
                if (playerElixir < stats.cost) {
                    slot.classList.add('disabled');
                } else {
                    slot.classList.remove('disabled');
                }
            } else {
                slot.classList.add('disabled');
            }
        }
    }


    // --- Tower Class ---
    class Tower {
        constructor(x, y, team, name, level) {
            const baseStats = name.includes("King") ? TOWER_STATS.king : TOWER_STATS.princess;
            const stats = calculateStats(baseStats, level);
            
            this.x = x; this.y = y; 
            this.width = (name.includes("King") ? 50 : 40); 
            this.height = (name.includes("King") ? 90 : 80); 
            this.team = team; this.name = name; 
            this.hp = stats.hp; 
            this.currentHP = stats.hp;
            this.dmg = stats.dmg;
            this.attackSpeed = stats.attackSpeed;
            this.range = stats.range; 
            
            this.isKingTower = name.includes("King");
            this.isKingTowerActive = !this.isKingTower; 
            
            this.lastAttackTime = 0;
            this.target = null; this.isRanged = true; this.rangeColor = team === 'blue' ? 'blue' : 'yellow'; 
            this.isFrozen = 0; 
            this.isSlowed = 0; 
            this.canTargetAir = true; this.isFlying = false;
            this.isDestroyed = false; 
        }
        get centerX() { return this.x; }
        get centerY() { return this.y; }
        
        applyKnockback() {} // Towers can't be knocked back
        get isBuilding() { return true; } // For Earthquake

        findTarget() {
            if (this.isFrozen > 0) return;
            const enemies = units.filter(u => u.team !== this.team && u.currentHP > 0);
            let closestTarget = null; let minDistance = Infinity;
            for (const target of enemies) {
                const distance = Math.sqrt(Math.pow(target.centerX - this.centerX, 2) + Math.pow(target.centerY - this.centerY, 2));
                if (distance < this.range && distance < minDistance) {
                    minDistance = distance; closestTarget = target;
                }
            }
            this.target = closestTarget;
        }
        
        update() {
            if (!this.isKingTowerActive) return; 
            
            if (this.isFrozen > 0) { this.isFrozen = Math.max(0, this.isFrozen - 1); return; }
            if (this.isSlowed > 0) { this.isSlowed = Math.max(0, this.isSlowed - 1); }
            
            if (this.currentHP <= 0) return;
            if (!this.target || this.target.currentHP <= 0) { this.findTarget(); }
            
            if (this.target) {
                const distance = Math.sqrt(Math.pow(this.target.centerX - this.centerX, 2) + Math.pow(this.target.centerY - this.centerY, 2));
                if (distance <= this.range) {
                    let currentAttackSpeed = this.attackSpeed;
                    if (this.isSlowed > 0) { currentAttackSpeed *= 1.35; } 
                    
                    if (gameTime - this.lastAttackTime >= (currentAttackSpeed * 60)) {
                        projectiles.push(new Projectile(this.x, this.y, this.target, this.dmg, this.rangeColor));
                        this.lastAttackTime = gameTime;
                    }
                }
            }
        }

        draw() {
            ctx.fillStyle = this.team;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            
            if (this.isKingTower && !this.isKingTowerActive) {
                ctx.fillStyle = 'gray'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
                ctx.fillText('👑', this.x, this.y - this.height / 2);
            } else if (this.isKingTower) {
                ctx.fillStyle = 'yellow'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
                ctx.fillText('👑', this.x, this.y - this.height / 2);
            }

            const healthRatio = this.currentHP / this.hp;
            ctx.fillStyle = healthRatio > 0.5 ? 'green' : (healthRatio > 0.2 ? 'orange' : 'red');
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width * healthRatio, 5);
            ctx.fillStyle = 'white'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
            ctx.fillText(Math.ceil(this.currentHP), this.x, this.y - 45); 
            if (this.isFrozen > 0) {
                ctx.fillStyle = 'cyan'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
                ctx.fillText('❄️', this.x, this.y + 10);
            } else if (this.isSlowed > 0) {
                 ctx.fillStyle = 'lightblue'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
                ctx.fillText('💧', this.x, this.y + 10);
            }
        }
    }

    // --- Building Class ---
    class Building {
        constructor(type, x, y, team, level) {
            const baseStats = STATS[type];
            Object.assign(this, calculateStats(baseStats, level));
            
            this.x = x; this.y = y; this.team = team;
            this.currentHP = this.hp;
            this.currentLifetime = this.lifetime;
            this.lastSpawnTime = 0;
            this.lastAttackTime = 0;
            this.target = null;
            this.deployTimer = this.deployTime || 0;
            this.isFrozen = 0;
            this.isSlowed = 0;
            this.drawColor = team === 'blue' ? 'rgba(0, 0, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            this.level = level; // Store level for spawns
        }
        
        get centerX() { return this.x + this.size / 2; }
        get centerY() { return this.y + this.size / 2; }
        get isBuilding() { return true; }
        applyKnockback() {} // Buildings can't be knocked back
        
        findTarget() {
            if (this.isFrozen > 0) return;
            const enemies = units.filter(u => u.team !== this.team && u.currentHP > 0);
            let potentialTargets = enemies;
            if (!this.canTargetAir) {
                potentialTargets = potentialTargets.filter(t => !t.isFlying);
            }
            if (potentialTargets.length === 0) { this.target = null; return; }
            
            let closestTarget = null; let minDistance = Infinity;
            for (const target of potentialTargets) {
                const distance = Math.sqrt(Math.pow(target.centerX - this.centerX, 2) + Math.pow(target.centerY - this.centerY, 2));
                if (distance < this.range && distance < minDistance) {
                    minDistance = distance; closestTarget = target;
                }
            }
            this.target = closestTarget;
        }

        update() {
            if (this.deployTimer > 0) { this.deployTimer--; return; }
            if (this.isFrozen > 0) { this.isFrozen = Math.max(0, this.isFrozen - 1); return; }
            if (this.isSlowed > 0) { this.isSlowed = Math.max(0, this.isSlowed - 1); }

            // Lose HP from lifetime decay
            this.currentHP -= (this.hp / this.lifetime);
            if (this.currentHP <= 0) return;
            
            let currentSpawnRate = this.spawnRate || 0;
            let currentAttackSpeed = this.attackSpeed || 0;
            if (this.isSlowed > 0) { 
                currentSpawnRate *= 1.35;
                currentAttackSpeed *= 1.35;
            }

            // Spawn units (if it's a spawner)
            if (this.spawnType && gameTime - (this.lastSpawnTime || 0) >= currentSpawnRate) {
                this.lastSpawnTime = gameTime;
                for (let i = 0; i < (this.spawnCount || 1); i++) {
                    units.push(new Unit(this.spawnType, this.centerX + (i * 5 - 5), this.centerY, this.team, this.level));
                }
            }
            
            // Attack (if it's an attacker)
            if (this.isAttacker) {
                if (!this.target || this.target.currentHP <= 0) { this.findTarget(); }
                if (this.target) {
                    const distance = Math.sqrt(Math.pow(this.target.centerX - this.centerX, 2) + Math.pow(this.target.centerY - this.centerY, 2));
                    if (distance <= this.range) {
                        if (gameTime - this.lastAttackTime >= (currentAttackSpeed * 60)) {
                            projectiles.push(new Projectile(this.centerX, this.centerY, this.target, this.dmg, 'gray', 0, 0, 'cannonball'));
                            this.lastAttackTime = gameTime;
                        }
                    } else {
                        this.target = null; // Target went out of range
                    }
                }
            }
        }

        draw() {
            if (this.deployTimer > 0 && gameTime % 10 < 5) { return; } // Flicker

            // Draw building
            ctx.fillStyle = this.drawColor;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.font = `${this.size * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icon, this.centerX, this.centerY);

            // Draw Health Bar
            const healthRatio = this.currentHP / this.hp;
            ctx.fillStyle = healthRatio > 0.5 ? 'green' : (healthRatio > 0.2 ? 'orange' : 'red');
            ctx.fillRect(this.x, this.y - 5, this.size * healthRatio, 3);
            
            // Draw Freeze/Slow
            if (this.isFrozen > 0) {
                ctx.fillStyle = 'cyan'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('❄️', this.x + this.size/2, this.y - 10);
            } else if (this.isSlowed > 0) {
                ctx.fillStyle = 'lightblue'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('💧', this.x + this.size/2, this.y - 10);
            }
        }
    }

    // --- Projectile Class (Handles Homing, Linear, and Splash) ---
    class Projectile {
        constructor(startX, startY, target, damage, color = 'yellow', stunFrames = 0, slowFrames = 0, projectileType = 'default', isSplash = false, splashRadius = 0) {
            this.x = startX; this.y = startY; this.target = target;
            this.damage = damage; this.speed = 10; this.size = 5; this.color = color;
            this.stunFrames = stunFrames;
            this.slowFrames = slowFrames;
            this.projectileType = projectileType;
            this.isSplash = isSplash;
            this.splashRadius = splashRadius;
            this.team = target.team === 'red' ? 'blue' : 'red'; // The projectile's team is the *opposite* of its target
            
            // For linear projectiles
            this.startX = startX;
            this.startY = startY;
            this.targetX = target.centerX;
            this.targetY = target.centerY;
            const dx = this.targetX - this.startX;
            const dy = this.targetY - this.startY;
            const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy));
            this.dx_norm = dx / dist; // Normalized direction vector
            this.dy_norm = dy / dist;
            this.travelled = 0;
            this.hitTargets = []; // For piercing
        }

        update() {
            if (this.projectileType === 'piercing_arrow' || this.projectileType === 'boulder') {
                return this.updateLinear();
            } else {
                return this.updateHoming();
            }
        }
        
        updateHoming() {
            if (!this.target || this.target.currentHP <= 0) { return true; }
            const targetX = this.target.centerX; const targetY = this.target.centerY;
            const dx = targetX - this.x; const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.speed) { 
                if (this.isSplash) {
                    // --- NEW: Handle ranged splash ---
                    applySpellEffects(targetX, targetY, { aoeRadius: this.splashRadius, damage: this.damage }, this.team);
                } else {
                    // --- Standard single-target hit ---
                    if (this.target.currentShieldHp > 0) {
                        this.target.currentShieldHp -= this.damage;
                    } else {
                        this.target.currentHP -= this.damage; 
                    }
                    if (this.target.isKingTower) { this.target.isKingTowerActive = true; }
                }
                
                // Apply stun/slow regardless
                if (this.stunFrames) { this.target.isFrozen = this.stunFrames; }
                if (this.slowFrames) { this.target.isSlowed = this.slowFrames; }
                return true; 
            }
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            return false;
        }
        
        updateLinear() {
            // Move in a straight line
            this.x += this.dx_norm * this.speed;
            this.y += this.dy_norm * this.speed;
            this.travelled += this.speed;
            
            const allTargets = this.team === 'blue' ? 
                [...units.filter(u => u.team === 'red'), ...buildings.filter(b => b.team === 'red'), ...towers.filter(t => t.team === 'red')] :
                [...units.filter(u => u.team === 'blue'), ...buildings.filter(b => b.team === 'blue'), ...towers.filter(t => t.team === 'blue')];

            for(const target of allTargets) {
                // Check for collision
                const distance = Math.sqrt(Math.pow(target.centerX - this.x, 2) + Math.pow(target.centerY - this.y, 2));
                const targetSize = target.size || target.width || 0;
                
                if (distance < (targetSize / 2) && !this.hitTargets.includes(target)) {
                    // Hit!
                    if (this.projectileType === 'piercing_arrow') {
                        // Hits air and ground
                        target.currentHP -= this.damage;
                        if (target.isKingTower) { target.isKingTowerActive = true; }
                        this.hitTargets.push(target); // Add to hit list
                    } 
                    else if (this.projectileType === 'boulder') {
                        if (target.isFlying) continue; // Boulders only hit ground
                        target.currentHP -= this.damage;
                        if (target.isKingTower) { target.isKingTowerActive = true; }
                        target.applyKnockback(50, this.x, this.y); // Apply knockback
                        this.hitTargets.push(target); // Boulders also only hit once
                    }
                }
            }
            
            // Destroy if it reaches max range (e.g., Magic Archer range)
            const maxRange = this.target.range || 117; // Default to MA range
            return this.travelled >= maxRange; 
        }

        draw() {
            if (this.projectileType === 'boulder') {
                ctx.fillStyle = 'gray'; ctx.beginPath();
                ctx.arc(this.x, this.y, 10, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = this.color; ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    // --- Spell Projectile Class (For Fireball, Rocket) ---
    class SpellProjectile {
        constructor(startX, startY, targetX, targetY, stats, team, level) {
            this.x = startX;
            this.y = startY;
            this.targetX = targetX;
            this.targetY = targetY;
            this.stats = calculateStats(stats, level); // Calculate stats based on level
            this.team = team;
            this.speed = (canvas.width / this.stats.travelTime);
            this.icon = this.stats.icon;
            this.level = level;
        }
        
        update() {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed) {
                applySpellEffects(this.targetX, this.targetY, this.stats, this.team, this.level);
                return true; 
            }
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            return false;
        }
        
        draw() {
            ctx.font = `30px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icon, this.x, this.y);
        }
    }
    
    // --- Spell Visual Effect Class ---
    class SpellVisual {
        constructor(x, y, radius) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.duration = 30; // 0.5 seconds
            this.maxDuration = 30;
        }
        
        update() {
            this.duration--;
            return this.duration <= 0; // Return true when done
        }
        
        draw() {
            const opacity = (this.duration / this.maxDuration) * 0.5; // Fade out
            ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * (1 - opacity), 0, Math.PI * 2); // Pulse in
            ctx.fill();
        }
    }

    // --- Lingering Spell Class (for Earthquake) ---
    class SpellEffectArea {
        constructor(x, y, stats, team, level) {
            this.x = x; this.y = y; 
            this.stats = calculateStats(stats, level); // Calculate stats
            this.team = team;
            this.duration = this.stats.duration;
        }
        
        update() {
            this.duration--;
            if (this.duration <= 0) return true; // Destroy
            
            // Damage targets
            const targets = [...units, ...towers, ...buildings];
            for (const target of targets) {
                if (target.team === this.team || target.currentHP <= 0) continue;
                
                const distance = Math.sqrt(Math.pow(target.centerX - this.x, 2) + Math.pow(target.centerY - this.y, 2));
                const targetSize = target.size || target.width || 0; 
                if (distance <= this.stats.aoeRadius + (targetSize / 2)) {
                    if (target.isBuilding) {
                        target.currentHP -= this.stats.buildingDmgPerFrame;
                        if (target.isKingTower) { target.isKingTowerActive = true; } // Activate king
                    } else {
                        target.currentHP -= this.stats.troopDmgPerFrame;
                    }
                }
            }
            return false;
        }
        
        draw() {
            const opacity = 0.3 + (Math.sin(gameTime / 5) * 0.2);
            ctx.fillStyle = `rgba(139, 69, 19, ${opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.stats.aoeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // --- Death Bomb Class (for Giant Skeleton) ---
    class DeathBomb {
        constructor(x, y, stats, team) {
            this.x = x; this.y = y; 
            this.stats = stats; // Stats are pre-calculated by unit
            this.team = team;
            this.timer = stats.timer;
        }
        
        update() {
            this.timer--;
            if (this.timer <= 0) {
                applySpellEffects(this.x, this.y, this.stats, this.team); // Pass pre-calculated stats
                return true; // Destroy
            }
            return false;
        }
        
        draw() {
            const icon = '💣';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            if (this.timer % 20 < 10) { // Flash
                ctx.fillText(icon, this.x, this.y);
            }
        }
    }
    
    // --- Global function to apply spell AOE damage/effects ---
    function applySpellEffects(x, y, stats, team, level = 1) {
        // Stats are pre-calculated if coming from a bomb or projectile
        // If coming from a spell, stats are base and need calculating
        const calculatedStats = (stats.travelTime > 0 || stats.duration > 0 || stats.timer > 0 || stats.isSplash) ? stats : calculateStats(stats, level);
        
        spellEffects.push(new SpellVisual(x, y, calculatedStats.aoeRadius));
        const targets = [...units, ...towers, ...buildings]; 
        
        for (const target of targets) {
            if (target.team === team || target.currentHP <= 0) continue; 
            
            const distance = Math.sqrt(Math.pow(target.centerX - x, 2) + Math.pow(target.centerY - y, 2));
            const targetSize = target.size || target.width || 0;
            
            if (distance <= calculatedStats.aoeRadius + (targetSize / 2)) {
                if (calculatedStats.damage) {
                    if (target.currentShieldHp > 0) {
                         target.currentShieldHp -= calculatedStats.damage;
                    } else {
                         target.currentHP -= calculatedStats.damage;
                    }
                    if (target.isKingTower) { target.isKingTowerActive = true; } // Activate king
                }
                if (calculatedStats.stunFrames) {
                    target.isFrozen = calculatedStats.stunFrames;
                }
                if (calculatedStats.freezeFrames) { // --- NEW: For Freeze Spell
                    target.isFrozen = calculatedStats.freezeFrames;
                }
                if (calculatedStats.knockback) {
                    target.applyKnockback(calculatedStats.knockback, x, y);
                }
            }
        }
    }


    // --- Base Unit Class ---
    class Unit {
        constructor(type, x, y, team, level) { 
            const baseStats = STATS[type];
            Object.assign(this, calculateStats(baseStats, level)); // Calculate stats on creation
            
            this.x = x; this.y = y; this.team = team; 
            this.currentHP = this.hp; 
            this.currentShieldHp = this.shieldHp || 0; 
            this.lastAttackTime = 0;
            this.target = null; this.isFrozen = 0; 
            this.isSlowed = 0; 
            this.isUnderground = this.name === 'Miner'; 
            this.drawColor = team === 'blue' ? 'rgba(0, 0, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            this.deployTimer = this.deployTime || 0; 
            this.bridgeTarget = null; 
            this.level = level; // Store level for spawns/bombs
        }

        get centerX() { return this.x + this.size / 2; }
        get centerY() { return this.y + this.size / 2; }
        get isBuilding() { return false; }

        applyKnockback(force, blastX, blastY) {
            if (this.isUnderground) return; 
            const dx = this.centerX - blastX;
            const dy = this.centerY - blastY;
            const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy)); 
            
            this.x += (dx / dist) * force;
            this.y += (dy / dist) * force;
            
            this.target = null;
        }

        findTarget() {
            let potentialTargets;
            
            if (this.targets === 'buildings') {
                const enemyTowers = towers.filter(t => t.team !== this.team && t.currentHP > 0);
                const enemyBuildings = buildings.filter(b => b.team !== this.team && b.currentHP > 0);
                potentialTargets = enemyTowers.concat(enemyBuildings);
            } else {
                const enemies = units.filter(u => u.team !== this.team && u.currentHP > 0 && !u.isUnderground);
                const enemyTowers = towers.filter(t => t.team !== this.team && t.currentHP > 0);
                const enemyBuildings = buildings.filter(b => b.team !== this.team && b.currentHP > 0);
                potentialTargets = enemies.concat(enemyTowers).concat(enemyBuildings);
            }

            if (!this.canTargetAir) {
                potentialTargets = potentialTargets.filter(t => !t.isFlying);
            }
            if (potentialTargets.length === 0) { this.target = null; return; }
            let closestTarget = null; let minDistance = Infinity;
            for (const target of potentialTargets) {
                const distance = Math.sqrt(Math.pow(target.centerX - this.centerX, 2) + Math.pow(target.centerY - this.centerY, 2));
                if (distance < minDistance) { minDistance = distance; closestTarget = target; }
            }
            this.target = closestTarget;
        }

        update() {
            if (this.currentShieldHp > 0) {
                this.currentHP = this.hp; // Keep main HP full
            } else if (this.transformOnShieldBreak) {
                // --- TRANSFORM ---
                buildings.push(new Building(this.transformOnShieldBreak, this.x, this.y, this.team, this.level));
                this.currentHP = 0; // "Destroy" this unit
                return;
            }
            
            if (this.currentHP <= 0) return;
            
            if (this.deployTimer > 0) {
                this.deployTimer--;
                return; 
            }
            
            if (this.isFrozen > 0) { this.isFrozen = Math.max(0, this.isFrozen - 1); return; }
            if (this.isSlowed > 0) { this.isSlowed = Math.max(0, this.isSlowed - 1); }
            
            if (this.name === 'Witch' && gameTime - (this.lastSpawnTime || 0) >= this.spawnRate) {
                this.lastSpawnTime = gameTime;
                units.push(new Unit('skeleton_unit', this.x - 5, this.y - 5, this.team, this.level));
                units.push(new Unit('skeleton_unit', this.x + 5, this.y - 5, this.team, this.level));
                units.push(new Unit('skeleton_unit', this.x - 5, this.y + 5, this.team, this.level));
                units.push(new Unit('skeleton_unit', this.x + 5, this.y + 5, this.team, this.level));
            }

            if (!this.target || this.target.currentHP <= 0) { this.findTarget(); }
            if (this.target) {
                const distance = Math.sqrt(Math.pow(this.target.centerX - this.centerX, 2) + Math.pow(this.target.centerY - this.centerY, 2));
                const effectiveRange = (this.size / 2) + (this.target.width || this.target.size || 0) / 2 + this.range;
                
                let currentSpeed = this.speed;
                let currentAttackSpeed = this.attackSpeed;
                if (this.isSlowed > 0) {
                    currentSpeed *= 0.65; // 35% slow
                    currentAttackSpeed *= 1.35; // 35% slower
                }

                if (distance <= effectiveRange) {
                    if (this.isUnderground) {
                        this.isUnderground = false;
                    }
                    
                    if (gameTime - this.lastAttackTime >= (currentAttackSpeed * 60)) { // Converted to frames
                        if (this.isRanged) {
                            projectiles.push(new Projectile(
                                this.centerX, this.centerY, 
                                this.target, this.dmg, 
                                this.projectileType === 'arrow' ? 'brown' : 
                                this.projectileType === 'ice' ? 'cyan' :
                                this.projectileType === 'zap' ? 'yellow' :
                                this.projectileType === 'magic' ? 'purple' :
                                this.projectileType === 'fireball' ? 'orange' :
                                this.projectileType === 'cannonball' ? 'gray' :
                                this.projectileType === 'bullet' ? 'gray' :
                                this.projectileType === 'bomb' ? 'black' :
                                this.projectileType === 'dart' ? 'green' :
                                'lightgreen', 
                                this.stunFrames || 0, 
                                this.slowFrames || 0,
                                this.projectileType || 'default',
                                this.isSplash || false,
                                this.splashRadius || 0
                            ));
                        } else {
                            if (this.isSplash) {
                                const allTargets = [...units, ...buildings, ...towers];
                                for (const splashTarget of allTargets) {
                                    if (splashTarget.team !== this.team && (this.canTargetAir || !splashTarget.isFlying)) {
                                        const splashDist = Math.sqrt(Math.pow(splashTarget.centerX - this.centerX, 2) + Math.pow(splashTarget.centerY - this.centerY, 2));
                                        if (splashDist <= (this.range + (splashTarget.size || splashTarget.width)/ 2)) {
                                            
                                            if (splashTarget.currentShieldHp > 0) {
                                                splashTarget.currentShieldHp -= this.dmg;
                                            } else {
                                                splashTarget.currentHP -= this.dmg;
                                            }
                                            if (splashTarget.isKingTower) { splashTarget.isKingTowerActive = true; }
                                        }
                                    }
                                }
                            } else {
                                // --- Standard Melee Hit ---
                                let damage = this.dmg;
                                if (this.name === 'Miner' && (this.target.isKingTower || this.target.name.includes("Princess"))) {
                                    damage = this.towerDamage;
                                }
                                
                                if (this.target.currentShieldHp > 0) {
                                    this.target.currentShieldHp -= damage;
                                } else {
                                    this.target.currentHP -= damage;
                                }
                                
                                if (this.target.isKingTower) { this.target.isKingTowerActive = true; }
                            }
                        }
                        this.lastAttackTime = gameTime;
                        if (this.name === 'Ice Spirit' && this.target.currentHP > 0) {
                            if (this.target.hasOwnProperty('isFrozen')) {
                                this.target.isFrozen = this.freezeFrames;
                            }
                            this.currentHP = 0;
                        }
                    }
                } else {
                    // --- Pathfinding Logic ---
                    let moveTargetX = this.target.centerX;
                    let moveTargetY = this.target.centerY;
                    
                    if (this.isUnderground) {
                        // Miner moves directly to target
                    }
                    else if (!this.isFlying) {
                        const isCrossingLeft = this.team === 'blue' && this.centerX < 275 && this.target.centerX > 325;
                        const isCrossingRight = this.team === 'red' && this.centerX > 325 && this.target.centerX < 275;

                        if (isCrossingLeft || isCrossingRight) {
                            // Need to pick a bridge
                            const distToTopBridge = Math.abs(this.centerY - bridgeTop.y);
                            const distToBottomBridge = Math.abs(this.centerY - bridgeBottom.y);
                            
                            if (distToTopBridge < distToBottomBridge) {
                                moveTargetX = bridgeTop.x;
                                moveTargetY = bridgeTop.y;
                            } else {
                                moveTargetX = bridgeBottom.x;
                                moveTargetY = bridgeBottom.y;
                            }
                        }
                    }
                    
                    const dx = moveTargetX - this.centerX;
                    const dy = moveTargetY - this.centerY;
                    const moveDistance = Math.max(1, Math.sqrt(dx*dx + dy*dy));
                    
                    this.x += (dx / moveDistance) * currentSpeed;
                    this.y += (dy / moveDistance) * currentSpeed;
                }
            }
        }

        draw() {
            if (this.deployTimer > 0 && gameTime % 10 < 5) {
                return; // Flicker by skipping draw
            }
            if (this.isUnderground) {
                ctx.fillStyle = this.team === 'blue' ? 'rgba(0, 0, 150, 0.5)' : 'rgba(150, 0, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(this.centerX, this.centerY, this.size / 2, 0, Math.PI); // Draw a semicircle
                ctx.fill();
                return; // Don't draw the rest
            }

            ctx.fillStyle = this.drawColor;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = `${this.size * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icon, this.centerX, this.centerY);
            
            // --- NEW: Shield Bar ---
            if (this.currentShieldHp > 0) {
                // Draw Shield Bar
                const shieldRatio = this.currentShieldHp / this.shieldHp;
                ctx.fillStyle = 'white';
                ctx.fillRect(this.x, this.y - 10, this.size * shieldRatio, 3);
                // Draw Health Bar below
                const healthRatio = this.currentHP / this.hp;
                ctx.fillStyle = healthRatio > 0.5 ? 'green' : (healthRatio > 0.2 ? 'orange' : 'red');
                ctx.fillRect(this.x, this.y - 5, this.size * healthRatio, 3);
            } else {
                // Draw Health Bar
                const healthRatio = this.currentHP / this.hp;
                ctx.fillStyle = healthRatio > 0.5 ? 'green' : (healthRatio > 0.2 ? 'orange' : 'red');
                ctx.fillRect(this.x, this.y - 5, this.size * healthRatio, 3);
            }
            
            if (this.isFrozen > 0) {
                ctx.fillStyle = 'cyan'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('❄️', this.x + this.size/2, this.y - 10);
            } else if (this.isSlowed > 0) {
                ctx.fillStyle = 'lightblue'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('💧', this.x + this.size/2, this.y - 10);
            }
        }
    }

    // --- Tower array (will be created on game start) ---
    let towers = [];

    // --- Core Game Functions ---
    function updateCrownDisplay() {
        if(playerCrownsDisplay) playerCrownsDisplay.textContent = `👑 ${playerCrowns}`;
        if(enemyCrownsDisplay) enemyCrownsDisplay.textContent = `👑 ${enemyCrowns}`;
    }
    function checkTowersForCrowns() {
        for (const tower of towers) {
            if (tower.currentHP <= 0 && !tower.isDestroyed) {
                tower.isDestroyed = true; 
                
                // --- NEW: Activate King Tower ---
                if (!tower.isKingTower) {
                    const kingTower = towers.find(t => t.team === tower.team && t.isKingTower);
                    if (kingTower) {
                        kingTower.isKingTowerActive = true;
                    }
                }
                
                if (tower.name.includes("King")) {
                    if (tower.team === 'red') { playerCrowns = 3; } else { enemyCrowns = 3; }
                } else if (tower.name.includes("Princess")) {
                     if (tower.team === 'red') { playerCrowns++; } else { enemyCrowns++; }
                }
                if (gameState === 'overtime') {
                    if (playerCrowns > enemyCrowns) { playerCrowns = 3; } 
                    else if (enemyCrowns > playerCrowns) { enemyCrowns = 3; }
                }
            }
        }
    }
    
    function updateElixir() {
        playerElixir = Math.min(maxElixir, playerElixir + currentElixirRate); 
        
        if (elixirLevelDisplay && elixirTextDisplay) {
            const percent = (playerElixir / maxElixir) * 100;
            elixirLevelDisplay.style.width = `${percent}%`;
            elixirTextDisplay.textContent = `${Math.floor(playerElixir)} / ${maxElixir}`;
        }
        
        updateHandElixirState();
    }
    function updateTimerDisplay() {
        if (!timerDisplay) return;
        if (gameState === 'overtime') {
            timerDisplay.textContent = "OVERTIME";
            timerDisplay.style.color = "#ff4444"; 
        } else {
            const minutes = Math.floor(matchTime / 60);
            let seconds = matchTime % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            timerDisplay.textContent = `${minutes}:${seconds}`;
        }
    }
    function updateGameState() {
        if (gameState === 'running') {
            matchTime--; 
            if (matchTime <= 0) {
                // --- MODIFIED: Only set game state. Coin logic is in gameLoop ---
                if (playerCrowns > enemyCrowns) {
                    gameState = 'ended'; 
                } else if (enemyCrowns > playerCrowns) {
                    gameState = 'ended'; 
                } else {
                    gameState = 'overtime'; 
                    elixirMessage = "OVERTIME: 3x ELIXIR!";
                    elixirMessageTime = 300; 
                }
            } else if (matchTime <= 60) {
                if (currentElixirRate !== baseElixirRate * 2) {
                    currentElixirRate = baseElixirRate * 2;
                    elixirMessage = "2x ELIXIR!";
                    elixirMessageTime = 300; 
                }
            }
        }
        if (gameState === 'overtime') {
            currentElixirRate = baseElixirRate * 3;
        } else if (matchTime <= 60) {
            currentElixirRate = baseElixirRate * 2;
        } else {
            currentElixirRate = baseElixirRate;
        }
    }

    // --- Function to draw the grid (for debugging) ---
    function drawGrid() {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += TILE_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += TILE_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // --- Function to draw the tile highlight ---
    function drawTileHighlight() {
        if (activeCardType && mouseCanvasX > 0) {
            const tileX = Math.floor(mouseCanvasX / TILE_SIZE);
            const tileY = Math.floor(mouseCanvasY / TILE_SIZE);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            const cardStats = STATS[activeCardType];
            
            // Miner can be placed anywhere
            if (cardStats.deployAnywhere) {
                // no red zone
            } else if (cardStats.type === 'troop' || cardStats.type === 'building') {
                const deploymentZoneMaxX = canvas.width / 2 - 10;
                if (mouseCanvasX > deploymentZoneMaxX) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Invalid = Red
                }
            }
            
            ctx.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }


    // --- Game Loop (Animation) ---
    function gameLoop() {
        gameTime++; 
        
        if (gameTime % 60 === 0 && gameState === 'running') { updateGameState(); }
        if (gameState === 'running') {
            updateElixir();
        }
        
        checkTowersForCrowns(); 
        updateCrownDisplay();   
        updateTimerDisplay();   

        // 1. Draw Background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#8c8'; // Green
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#66f'; // River
        ctx.fillRect(canvas.width / 2 - 10, 0, 20, canvas.height); // Vertical river
        ctx.fillStyle = '#a0522d'; // Brown
        ctx.fillRect(canvas.width / 2 - 25, 65, 50, 20); // Top bridge
        ctx.fillRect(canvas.width / 2 - 25, 215, 50, 20); // Bottom bridge

        ctx.fillStyle = 'rgba(0, 0, 255, 0.1)'; 
        ctx.fillRect(0, 0, canvas.width / 2 - 10, canvas.height);
        
        drawTileHighlight();
        if (DEBUG_DRAW_GRID) { drawGrid(); }

        // 2. Update and Draw Towers
        for (const tower of towers) {
            if (tower.currentHP > 0) {
                tower.update();
                tower.draw();
            }
        }
        
        // --- NEW: Update and Draw Buildings ---
        for (let i = buildings.length - 1; i >= 0; i--) {
            buildings[i].update();
            buildings[i].draw();
            if (buildings[i].currentHP <= 0) {
                // --- NEW: Handle building death spawn ---
                if (buildings[i].deathSpawn) {
                    for (let j = 0; j < buildings[i].deathSpawnCount; j++) {
                        units.push(new Unit(buildings[i].deathSpawn, buildings[i].x + (j*5 - 10), buildings[i].y, buildings[i].team, buildings[i].level));
                    }
                }
                buildings.splice(i, 1);
            }
        }

        // 3. Update and Draw Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            if (projectiles[i].update()) {
                projectiles.splice(i, 1);
            } else {
                projectiles[i].draw();
            }
        }
        
        // 4. Update and Draw Spell Projectiles
        for (let i = spellProjectiles.length - 1; i >= 0; i--) {
            if (spellProjectiles[i].update()) {
                spellProjectiles.splice(i, 1);
            } else {
                spellProjectiles[i].draw();
            }
        }

        // 5. Update and Draw Units
        for (let i = units.length - 1; i >= 0; i--) {
            const unit = units[i];
            unit.update();
            unit.draw();
            
            if (unit.currentHP <= 0 && unit.currentShieldHp <= 0) { // Check both
                if (unit.deathSpawn) {
                    const spawnType = unit.deathSpawn;
                    units.push(new Unit(spawnType, unit.x - 10, unit.y, unit.team, unit.level));
                    units.push(new Unit(spawnType, unit.x + 10, unit.y, unit.team, unit.level));
                }
                if (unit.deathBombStats) {
                    deathBombs.push(new DeathBomb(unit.centerX, unit.centerY, unit.deathBombStats, unit.team));
                }
                units.splice(i, 1);
            }
        }
        
        // 6. Update and Draw Spell Effects (AOE circle)
        for (let i = spellEffects.length - 1; i >= 0; i--) {
            if (spellEffects[i].update()) {
                spellEffects.splice(i, 1);
            } else {
                spellEffects[i].draw();
            }
        }
        
        // --- NEW: Update and Draw Death Bombs ---
        for (let i = deathBombs.length - 1; i >= 0; i--) {
            if (deathBombs[i].update()) {
                deathBombs.splice(i, 1);
            } else {
                deathBombs[i].draw();
            }
        }
        
        // --- NEW: Update and Draw Lingering Spells (Earthquake) ---
        for (let i = spellAreas.length - 1; i >= 0; i--) {
            if (spellAreas[i].update()) {
                spellAreas.splice(i, 1);
            } else {
                spellAreas[i].draw();
            }
        }
        
        // 7. Win/Loss condition
        if (gameState !== 'running') return; // Stop loop if game has ended

        if (playerCrowns >= 3 || (gameState === 'ended' && playerCrowns > enemyCrowns)) {
            gameState = 'ended'; // Set state
            ctx.fillStyle = 'black';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PLAYER VICTORY!', canvas.width / 2, canvas.height / 2);
            replayButton.style.display = 'block'; 
            
            // --- COIN FIX ---
            const reward = Math.round(BASE_COIN_REWARD * coinMultiplier);
            playerProgress.coins += reward;
            elixirMessage = `VICTORY! +${reward} COINS!`;
            elixirMessageTime = 9999;
            saveProgress();
            // --- END FIX ---
            return;
        }
        
        if (enemyCrowns >= 3 || (gameState === 'ended' && enemyCrowns > playerCrowns)) {
            gameState = 'ended'; // Set state
            ctx.fillStyle = 'black';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ENEMY VICTORY!', canvas.width / 2, canvas.height / 2);
            replayButton.style.display = 'block'; 
            
            // --- COIN FIX ---
            const reward = Math.round(BASE_COIN_REWARD * coinMultiplier * 0.25); // 25% for a loss
            playerProgress.coins += reward;
            elixirMessage = `DEFEAT! +${reward} COINS!`;
            elixirMessageTime = 9999;
            saveProgress();
            // --- END FIX ---
            return;
        }

        // 8. Draw Elixir Message
        if (elixirMessageTime > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(elixirMessage, canvas.width / 2, canvas.height / 2);
            elixirMessageTime--;
        }

        requestAnimationFrame(gameLoop);
    }

    // --- Card Selection and Deployment Logic ---
    handSlots.forEach((slot, index) => {
        slot.addEventListener('click', () => {
            if (slot.classList.contains('disabled') || gameState === 'ended') { return; }
            const cardType = hand[index];
            if (activeCardSlot === index) {
                activeCardType = null;
                activeCardSlot = -1;
                slot.classList.remove('selected');
                hoverSymbol.style.display = 'none'; 
            } else {
                handSlots.forEach(s => s.classList.remove('selected'));
                activeCardType = cardType;
                activeCardSlot = index;
                slot.classList.add('selected');
                hoverSymbol.innerHTML = STATS[activeCardType].icon;
                hoverSymbol.style.display = 'block';
            }
        });
    });


    // Canvas click now handles deployment
    canvas.addEventListener('click', (event) => {
        if (activeCardSlot === -1 || !activeCardType || gameState === 'ended') { return; } 
        
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        const unitType = activeCardType;
        const cardStats = STATS[unitType]; // Base stats
        const cardCost = cardStats.cost;
        const cardLevel = playerProgress.cardLevels[unitType]; // --- NEW: Get card level

        if (playerElixir < cardCost) { return; }
        
        // Find spawn location
        const tileX = Math.floor(clickX / TILE_SIZE);
        const tileY = Math.floor(clickY / TILE_SIZE);
        const spawnX_center = (tileX * TILE_SIZE) + (TILE_SIZE / 2);
        const spawnY_center = (tileY * TILE_SIZE) + (TILE_SIZE / 2);
        const spawnX = spawnX_center - (cardStats.size || 0) / 2;
        const spawnY = spawnY_center - (cardStats.size || 0) / 2;
        
        const deploymentZoneMaxX = canvas.width / 2 - 10; 
        
        if (cardStats.type === 'troop') {
            // --- NEW: Miner "Deploy Anywhere" logic ---
            if (!cardStats.deployAnywhere && clickX > deploymentZoneMaxX) { 
                console.log("Can only deploy troops on your side!");
                return; 
            }
            playerElixir -= cardCost;
            
            // --- MODIFIED: Pass cardLevel to all spawns ---
            if (unitType === 'archer') {
                units.push(new Unit('archer', spawnX - 5, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('archer', spawnX + 5, spawnY, 'blue', cardLevel)); 
            } else if (unitType === 'skeleton') {
                units.push(new Unit('skeleton_unit', spawnX, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('skeleton_unit', spawnX - 10, spawnY - 5, 'blue', cardLevel)); 
                units.push(new Unit('skeleton_unit', spawnX + 10, spawnY + 5, 'blue', cardLevel)); 
            } else if (unitType === 'barbarians') {
                units.push(new Unit('barbarian_unit', spawnX, spawnY, 'blue', cardLevel));
                units.push(new Unit('barbarian_unit', spawnX - 10, spawnY - 10, 'blue', cardLevel));
                units.push(new Unit('barbarian_unit', spawnX + 10, spawnY - 10, 'blue', cardLevel));
                units.push(new Unit('barbarian_unit', spawnX - 10, spawnY + 10, 'blue', cardLevel));
                units.push(new Unit('barbarian_unit', spawnX + 10, spawnY + 10, 'blue', cardLevel));
            } else if (unitType === 'spear_goblins') {
                units.push(new Unit('spear_goblin_unit', spawnX, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('spear_goblin_unit', spawnX - 10, spawnY - 5, 'blue', cardLevel)); 
                units.push(new Unit('spear_goblin_unit', spawnX + 10, spawnY + 5, 'blue', cardLevel)); 
            } else if (unitType === 'zappies') {
                units.push(new Unit('zappies', spawnX, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('zappies', spawnX - 10, spawnY - 5, 'blue', cardLevel)); 
                units.push(new Unit('zappies', spawnX + 10, spawnY + 5, 'blue', cardLevel)); 
            } else if (unitType === 'bats') {
                units.push(new Unit('bats', spawnX, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('bats', spawnX - 10, spawnY - 5, 'blue', cardLevel)); 
                units.push(new Unit('bats', spawnX + 10, spawnY + 5, 'blue', cardLevel)); 
                units.push(new Unit('bats', spawnX - 5, spawnY + 5, 'blue', cardLevel)); 
                units.push(new Unit('bats', spawnX + 5, spawnY - 5, 'blue', cardLevel)); 
            } else if (unitType === 'goblins') {
                units.push(new Unit('goblins', spawnX, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('goblins', spawnX - 10, spawnY - 5, 'blue', cardLevel)); 
                units.push(new Unit('goblins', spawnX + 10, spawnY + 5, 'blue', cardLevel)); 
            } else if (unitType === 'minions') {
                units.push(new Unit('minion_unit', spawnX, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX - 10, spawnY - 5, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX + 10, spawnY + 5, 'blue', cardLevel)); 
            } else if (unitType === 'minion_horde') {
                units.push(new Unit('minion_unit', spawnX - 10, spawnY - 10, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX + 10, spawnY - 10, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX - 10, spawnY + 10, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX + 10, spawnY + 10, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX - 20, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('minion_unit', spawnX + 20, spawnY, 'blue', cardLevel)); 
            } else if (unitType === 'elite_barbarians') {
                units.push(new Unit('elite_barbarians', spawnX - 5, spawnY, 'blue', cardLevel)); 
                units.push(new Unit('elite_barbarians', spawnX + 5, spawnY, 'blue', cardLevel)); 
            } else {
                const newUnit = new Unit(unitType, spawnX, spawnY, 'blue', cardLevel); 
                units.push(newUnit);
            }

        } else if (cardStats.type === 'building') {
            if (clickX > deploymentZoneMaxX) { 
                console.log("Can only deploy buildings on your side!");
                return; 
            }
            playerElixir -= cardCost;
            buildings.push(new Building(unitType, spawnX, spawnY, 'blue', cardLevel));

        } else if (cardStats.type === 'spell') {
            playerElixir -= cardCost;
            
            if (cardStats.travelTime === 0) {
                // INSTANT spell (Zap, Snowball, Earthquake)
                if (cardStats.duration > 0) {
                    spellAreas.push(new SpellEffectArea(clickX, clickY, cardStats, 'blue', cardLevel));
                } else {
                    applySpellEffects(clickX, clickY, cardStats, 'blue', cardLevel);
                }
            } else {
                // TRAVEL-TIME spell (Fireball, Rocket)
                const kingTower = towers.find(t => t.team === 'blue' && t.isKingTower);
                spellProjectiles.push(new SpellProjectile(kingTower.centerX, kingTower.centerY, clickX, clickY, cardStats, 'blue', cardLevel));
            }
        }

        // --- CYCLE THE CARD ---
        playCard(activeCardSlot);

        // Deselect
        activeCardType = null;
        activeCardSlot = -1;
        updateHandElixirState(); 
        hoverSymbol.style.display = 'none'; // Hide hover symbol
    });

    // --- Listeners for hover symbol and tile ---
    document.addEventListener('mousemove', (e) => {
        hoverSymbol.style.left = e.pageX + 'px';
        hoverSymbol.style.top = e.pageY + 'px';
    });
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseCanvasX = e.clientX - rect.left;
        mouseCanvasY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseout', () => {
        mouseCanvasX = -100;
        mouseCanvasY = -100;
    });


    // --- Enemy Spawning Function ---
    function spawnEnemy() {
        if (gameState === 'ended') {
            clearInterval(enemySpawnInterval); 
            return; 
        }
        
        const currentEnemyCount = units.filter(u => u.team === 'red').length;
        if (currentEnemyCount >= 8) return; 

        for (let i = 0; i < enemySpawnCount; i++) {
            const cardType = enemyDeck[Math.floor(Math.random() * enemyDeck.length)];
            const cardStats = STATS[cardType];
            const cardLevel = enemyLevel; // --- NEW: Use enemy level
            
            const spawnX_random = Math.random() * (canvas.width / 2 - (cardStats.size || 20) - 10) + (canvas.width / 2 + 10);
            const spawnY_random = Math.random() * (canvas.height - (cardStats.size || 20) - 10) + 5;
            
            const tileX = Math.floor(spawnX_random / TILE_SIZE);
            const tileY = Math.floor(spawnY_random / TILE_SIZE);
            const spawnX_center = (tileX * TILE_SIZE) + (TILE_SIZE / 2);
            const spawnY_center = (tileY * TILE_SIZE) + (TILE_SIZE / 2);
            
            const spawnX = spawnX_center - (cardStats.size || 0) / 2;
            const spawnY = spawnY_center - (cardStats.size || 0) / 2;

            
            if (cardStats.type === 'troop') {
                // --- THIS IS THE FIX ---
                // Check for all multi-spawn cards
                if (cardType === 'archer') {
                    units.push(new Unit('archer', spawnX - 5, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('archer', spawnX + 5, spawnY, 'red', cardLevel)); 
                } else if (cardType === 'skeleton') {
                    units.push(new Unit('skeleton_unit', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('skeleton_unit', spawnX - 10, spawnY - 5, 'red', cardLevel)); 
                    units.push(new Unit('skeleton_unit', spawnX + 10, spawnY + 5, 'red', cardLevel)); 
                } else if (cardType === 'barbarians') {
                    units.push(new Unit('barbarian_unit', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('barbarian_unit', spawnX - 10, spawnY - 10, 'red', cardLevel)); 
                    units.push(new Unit('barbarian_unit', spawnX + 10, spawnY - 10, 'red', cardLevel)); 
                    units.push(new Unit('barbarian_unit', spawnX - 10, spawnY + 10, 'red', cardLevel)); 
                    units.push(new Unit('barbarian_unit', spawnX + 10, spawnY + 10, 'red', cardLevel)); 
                } else if (cardType === 'spear_goblins') {
                    units.push(new Unit('spear_goblin_unit', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('spear_goblin_unit', spawnX - 10, spawnY - 5, 'red', cardLevel)); 
                    units.push(new Unit('spear_goblin_unit', spawnX + 10, spawnY + 5, 'red', cardLevel)); 
                } else if (cardType === 'zappies') {
                    units.push(new Unit('zappies', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('zappies', spawnX - 10, spawnY - 5, 'red', cardLevel)); 
                    units.push(new Unit('zappies', spawnX + 10, spawnY + 5, 'red', cardLevel)); 
                } else if (cardType === 'bats') {
                    units.push(new Unit('bats', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('bats', spawnX - 10, spawnY - 5, 'red', cardLevel)); 
                    units.push(new Unit('bats', spawnX + 10, spawnY + 5, 'red', cardLevel)); 
                    units.push(new Unit('bats', spawnX - 5, spawnY + 5, 'red', cardLevel)); 
                    units.push(new Unit('bats', spawnX + 5, spawnY - 5, 'red', cardLevel)); 
                } else if (cardType === 'goblins') {
                    units.push(new Unit('goblins', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('goblins', spawnX - 10, spawnY - 5, 'red', cardLevel)); 
                    units.push(new Unit('goblins', spawnX + 10, spawnY + 5, 'red', cardLevel)); 
                } else if (cardType === 'minions') {
                    units.push(new Unit('minion_unit', spawnX, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX - 10, spawnY - 5, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX + 10, spawnY + 5, 'red', cardLevel)); 
                } else if (cardType === 'minion_horde') {
                    units.push(new Unit('minion_unit', spawnX - 10, spawnY - 10, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX + 10, spawnY - 10, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX - 10, spawnY + 10, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX + 10, spawnY + 10, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX - 20, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('minion_unit', spawnX + 20, spawnY, 'red', cardLevel)); 
                } else if (cardType === 'elite_barbarians') {
                    units.push(new Unit('elite_barbarians', spawnX - 5, spawnY, 'red', cardLevel)); 
                    units.push(new Unit('elite_barbarians', spawnX + 5, spawnY, 'red', cardLevel)); 
                } else if (cardType === 'miner') {
                    const playerTargets = [...towers, ...buildings].filter(t => t.team === 'blue' && t.currentHP > 0);
                    if (playerTargets.length > 0) {
                        const target = playerTargets[Math.floor(Math.random() * playerTargets.length)];
                        const minerUnit = new Unit(cardType, target.centerX, target.centerY, 'red', cardLevel);
                        units.push(minerUnit);
                    }
                } else {
                    // This is for all single-spawn troops (Knight, PEKKA, Wizard, etc.)
                    const newUnit = new Unit(cardType, spawnX, spawnY, 'red', cardLevel); 
                    units.push(newUnit);
                }
                // --- END OF FIX ---
                
            } else if (cardStats.type === 'building') {
                 buildings.push(new Building(cardType, spawnX, spawnY, 'red', cardLevel));
                 
            } else if (cardStats.type === 'spell') {
                const playerTargets = [...units, ...towers, ...buildings].filter(t => t.team === 'blue' && t.currentHP > 0);
                if (playerTargets.length > 0) {
                    const target = playerTargets[Math.floor(Math.random() * playerTargets.length)];
                    
                    if (cardStats.travelTime === 0) {
                        if (cardStats.duration > 0) {
                            spellAreas.push(new SpellEffectArea(target.centerX, target.centerY, cardStats, 'red', cardLevel));
                        } else {
                            applySpellEffects(target.centerX, target.centerY, cardStats, 'red', cardLevel);
                        }
                    } else {
                        const kingTower = towers.find(t => t.team === 'red' && t.isKingTower);
                        spellProjectiles.push(new SpellProjectile(kingTower.centerX, kingTower.centerY, target.centerX, target.centerY, cardStats, 'red', cardLevel));
                    }
                }
            }
        }
    }

    // --- START GAME LOGIC ---
    
    // --- NEW: Load progress on start ---
    loadProgress();
    
    // 1. Show Intro Modal
    initializeDeckBuilder(); 
    clearCardStats(); // Show initial coin/king level
    
    // 2. Handle "Build Deck" click
    startBuildButton.addEventListener('click', () => {
        introModal.style.display = 'none';
        deckBuilderModal.style.display = 'flex';
    });
    
    // 3. Handle "Confirm Deck" click
    confirmDeckButton.addEventListener('click', () => {
        // --- NEW: Filter out any null slots before saving ---
        fullDeck = playerProgress.savedDeck.filter(card => card !== null); 
        
        if (fullDeck.length !== 8) {
            alert("Your deck must have 8 cards!");
            return;
        }
        
        saveProgress(); // --- Save the final deck
        deckBuilderModal.style.display = 'none';
        difficultyModal.style.display = 'flex';
    });
    
    // 3b. Handle "Randomize Deck" click
    randomizeDeckButton.addEventListener('click', () => {
        const allCardTypes = shuffleDeck(Object.keys(MASTER_CARD_LIST).filter(c => MASTER_CARD_LIST[c].type !== 'troop_hidden' && MASTER_CARD_LIST[c].type !== 'building_hidden'));
        
        // --- NEW: Fill the savedDeck array ---
        for (let i = 0; i < 8; i++) {
            playerProgress.savedDeck[i] = allCardTypes[i];
            playerDeck[i] = allCardTypes[i]; // <-- FIX: Sync playerDeck
        }

        // Update the UI
        updateSavedDeckUI();
        updateDeckBuilderCounters();
    });
    
    // --- NEW: Replay Button Click ---
    replayButton.addEventListener('click', () => {
        location.reload(); // The simplest and cleanest way to restart
    });
    
    // 4. Handle "Difficulty" click
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            enemySpawnRate = parseInt(button.getAttribute('data-rate'));
            enemySpawnCount = parseInt(button.getAttribute('data-spawn-count'));
            coinMultiplier = parseFloat(button.getAttribute('data-multiplier')); // --- NEW
            
            // --- NEW: Calculate enemy level based on player's deck ---
            let totalLevel = 0;
            for (const cardType of fullDeck) {
                totalLevel += playerProgress.cardLevels[cardType];
            }
            enemyLevel = Math.max(1, Math.round(totalLevel / 8));
            // ---

            difficultyModal.style.display = 'none';
            
            gameContainer.style.display = 'inline-block';
            handContainer.style.display = 'inline-block'; 
            handContainer.style.flexDirection = 'column'; 
            handContainer.style.alignItems = 'center'; 
            
            // --- NEW: Create towers with correct levels ---
            towers = [
                new Tower(30, 150, 'blue', 'Player King', playerProgress.kingTowerLevel), 
                new Tower(80, 75, 'blue', 'Player Princess', playerProgress.kingTowerLevel),
                new Tower(80, 225, 'blue', 'Player Princess', playerProgress.kingTowerLevel), 
                new Tower(570, 150, 'red', 'Enemy King', enemyLevel),
                new Tower(520, 75, 'red', 'Enemy Princess', enemyLevel), 
                new Tower(520, 225, 'red', 'Enemy Princess', enemyLevel)
            ];

            // --- Setup the Player's deck ---
            drawPile = shuffleDeck([...fullDeck]); 
            discardPile = [];
            for (let i = 0; i < 4; i++) { 
                drawCard();
            }
            
            // --- Create a random 8-card deck for the AI ---
            const allCardTypes = shuffleDeck(Object.keys(MASTER_CARD_LIST).filter(c => c.type !== 'troop_hidden' && c.type !== 'building_hidden'));
            enemyDeck = allCardTypes.slice(0, 8); 

            enemySpawnInterval = setInterval(spawnEnemy, enemySpawnRate);
            
            gameLoop();
        });
    });

}); // --- END OF DOMCONTENTLOADED WRAPPER ---