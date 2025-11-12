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
    
    // --- NEW: Pathfinding Waypoints ---
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
    
    // Difficulty Settings
    let enemySpawnRate = 6500; 
    let enemySpawnCount = 1; 
    let enemySpawnInterval = null; 

    // Game Arrays
    const units = []; 
    const buildings = []; // For Goblin Hut
    const projectiles = []; // For arrows, etc.
    const spellProjectiles = []; // For Fireball, Rocket
    const spellEffects = []; // For AOE visuals
    const spellAreas = []; // For Earthquake
    const deathBombs = []; // For Giant Skeleton
    
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
    let playerDeck = []; // The 8 cards the player chooses
    let enemyDeck = []; // The AI's 8-card deck
    let fullDeck = []; // The 8 cards used in the match
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

    // --- Master Card List (Level 11 Stats) ---
    // Speeds: Slow (0.6), Medium (1.0), Fast (1.4), Very Fast (1.8)
    const MASTER_CARD_LIST = {
        // --- TROOPS ---
        knight: { type: 'troop', name: 'Knight', icon: '🤺', size: 28, hp: 1596, dmg: 186, speed: 1.0, range: 10, attackSpeed: 1.2, cost: 3, canTargetAir: false, isFlying: false, displayName: 'Knight', deployTime: 60 },
        archer: { type: 'troop', name: 'Archer', icon: '🏹', size: 22, hp: 279, dmg: 96, speed: 1.0, range: 150, attackSpeed: 1.2, cost: 3, isRanged: true, projectileColor: 'lightgreen', canTargetAir: true, isFlying: false, displayName: 'Archers (x2)', deployTime: 60 },
        giant: { type: 'troop', name: 'Giant', icon: '🏋️', size: 35, hp: 3619, dmg: 231, speed: 0.6, range: 10, attackSpeed: 1.5, cost: 5, canTargetAir: false, isFlying: false, displayName: 'Giant', deployTime: 60, targets: 'buildings' },
        mini_pekka: { type: 'troop', name: 'Mini P.E.K.K.A', icon: '🤖', size: 25, hp: 1056, dmg: 572, speed: 1.4, range: 10, attackSpeed: 1.8, cost: 4, canTargetAir: false, isFlying: false, displayName: 'Mini P.E.K.K.A', deployTime: 60 },
        baby_dragon: { type: 'troop', name: 'Baby Dragon', icon: '🐉', size: 35, hp: 1024, dmg: 146, speed: 1.4, range: 120, attackSpeed: 1.5, cost: 4, isRanged: true, projectileColor: 'orange', canTargetAir: true, isFlying: true, displayName: 'Baby Dragon', deployTime: 60 },
        skeleton: { type: 'troop', name: 'Skeleton', icon: '💀', size: 18, hp: 79, dmg: 79, speed: 1.4, range: 10, attackSpeed: 1.0, cost: 1, canTargetAir: false, isFlying: false, displayName: 'Skeletons (x3)', deployTime: 60 },
        witch: { type: 'troop', name: 'Witch', icon: '🧙', size: 28, hp: 768, dmg: 122, speed: 1.0, range: 130, attackSpeed: 1.1, cost: 5, isRanged: true, projectileColor: 'purple', canTargetAir: true, isFlying: false, lastSpawnTime: 0, spawnRate: 420, displayName: 'Witch', deployTime: 60 }, // 7s spawn
        barbarians: { type: 'troop', name: 'Barbarians', icon: '⚔️', size: 26, hp: 387, dmg: 120, speed: 1.0, range: 10, attackSpeed: 1.4, cost: 5, canTargetAir: false, isFlying: false, displayName: 'Barbarians (x5)', deployTime: 60 },
        golem: { type: 'troop', name: 'Golem', icon: '🪨', size: 40, hp: 4679, dmg: 284, speed: 0.6, range: 10, attackSpeed: 2.5, cost: 8, canTargetAir: false, isFlying: false, displayName: 'Golem', deployTime: 60, deathSpawn: 'golemite', targets: 'buildings' },
        ice_spirit: { type: 'troop', name: 'Ice Spirit', icon: '❄️', size: 20, hp: 210, dmg: 95, speed: 1.8, range: 10, attackSpeed: 0.5, cost: 1, freezeFrames: 78, canTargetAir: true, isFlying: false, displayName: 'Ice Spirit', deployTime: 60 },
        spear_goblins: { type: 'troop', name: 'Spear Goblins', icon: '👺', size: 20, hp: 133, dmg: 80, speed: 1.8, range: 150, attackSpeed: 1.1, cost: 2, isRanged: true, projectileColor: 'brown', canTargetAir: true, isFlying: false, displayName: 'Spear Goblins (x3)', deployTime: 60 },
        ice_wizard: { type: 'troop', name: 'Ice Wizard', icon: '🥶', size: 28, hp: 704, dmg: 111, speed: 1.0, range: 165, attackSpeed: 1.7, cost: 3, isRanged: true, projectileColor: 'cyan', canTargetAir: true, isFlying: false, displayName: 'Ice Wizard', deployTime: 60, slowFrames: 150 }, // 2.5s slow
        zappies: { type: 'troop', name: 'Zappies', icon: '🔋', size: 22, hp: 318, dmg: 86, speed: 1.0, range: 135, attackSpeed: 1.6, cost: 4, isRanged: true, projectileColor: 'yellow', canTargetAir: true, isFlying: false, displayName: 'Zappies (x3)', deployTime: 60, stunFrames: 30 }, // 0.5s stun
        giant_skeleton: { type: 'troop', name: 'Giant Skeleton', icon: '☠️', size: 38, hp: 2904, dmg: 186, speed: 1.0, range: 10, attackSpeed: 1.5, cost: 6, canTargetAir: false, isFlying: false, displayName: 'Giant Skeleton', deployTime: 60, deathBombStats: { damage: 1060, aoeRadius: 100, timer: 180 } }, // 3s bomb timer
        
        // --- NEW "PHASE 1" TROOPS ---
        bats: { type: 'troop', name: 'Bats', icon: '🦇', size: 18, hp: 79, dmg: 79, speed: 1.4, range: 10, attackSpeed: 1.0, cost: 2, canTargetAir: true, isFlying: true, displayName: 'Bats (x5)', deployTime: 60 },
        goblins: { type: 'troop', name: 'Goblins', icon: '🟢', size: 20, hp: 190, dmg: 119, speed: 1.8, range: 10, attackSpeed: 1.1, cost: 2, canTargetAir: false, isFlying: false, displayName: 'Goblins (x3)', deployTime: 60 },
        minions: { type: 'troop', name: 'Minions', icon: '👿', size: 24, hp: 215, dmg: 100, speed: 1.4, range: 10, attackSpeed: 1.0, cost: 3, canTargetAir: true, isFlying: true, displayName: 'Minions (x3)', deployTime: 60 },
        minion_horde: { type: 'troop', name: 'Minion Horde', icon: '👿👿', size: 24, hp: 215, dmg: 100, speed: 1.4, range: 10, attackSpeed: 1.0, cost: 5, canTargetAir: true, isFlying: true, displayName: 'Minion Horde (x6)', deployTime: 60, spawnUnit: 'minion_unit' },
        royal_giant: { type: 'troop', name: 'Royal Giant', icon: '👑🏋️', size: 35, hp: 2794, dmg: 273, speed: 0.6, range: 195, attackSpeed: 1.7, cost: 6, isRanged: true, canTargetAir: false, isFlying: false, displayName: 'Royal Giant', deployTime: 60, targets: 'buildings' },
        elite_barbarians: { type: 'troop', name: 'Elite Barbarians', icon: '💨⚔️', size: 28, hp: 1113, dmg: 332, speed: 1.8, range: 10, attackSpeed: 1.7, cost: 6, canTargetAir: false, isFlying: false, displayName: 'E-Barbs (x2)', deployTime: 60 },
        
        // --- SPELLS (5) ---
        zap: { type: 'spell', name: 'Zap', icon: '⚡', cost: 2, displayName: 'Zap', aoeRadius: 40, damage: 174, stunFrames: 30, travelTime: 0 }, // 0.5s stun
        snowball: { type: 'spell', name: 'Snowball', icon: '⚪', cost: 2, displayName: 'Snowball', aoeRadius: 40, damage: 106, knockback: 30, travelTime: 0 },
        fireball: { type: 'spell', name: 'Fireball', icon: '🔥', cost: 4, displayName: 'Fireball', aoeRadius: 50, damage: 627, travelTime: 50 },
        rocket: { type: 'spell', name: 'Rocket', icon: '🚀', cost: 6, displayName: 'Rocket', aoeRadius: 40, damage: 1373, travelTime: 100 },
        earthquake: { type: 'spell', name: 'Earthquake', icon: '💥', cost: 3, displayName: 'Earthquake', aoeRadius: 70, duration: 180, troopDmgPerFrame: 1.13, buildingDmgPerFrame: 4.53, travelTime: 0 }, // 204 / 180, 816 / 180

        // --- BUILDINGS (2) ---
        goblin_hut: { type: 'building', name: 'Goblin Hut', icon: '🛖', size: 40, hp: 1293, cost: 5, displayName: 'Goblin Hut', deployTime: 60, lifetime: 1740, spawnRate: 240, spawnType: 'spear_goblin_unit', isAttacker: false }, // 29s life, 4s spawn
        cannon: { type: 'building', name: 'Cannon', icon: '💣', size: 40, hp: 689, dmg: 142, attackSpeed: 0.8, range: 165, cost: 3, displayName: 'Cannon', deployTime: 60, lifetime: 1800, canTargetAir: false, isAttacker: true }, // 30s life

        // --- HIDDEN UNITS (for spawning) ---
        golemite: { type: 'troop_hidden', name: 'Golemite', icon: '🗿', size: 30, hp: 947, dmg: 57, speed: 0.6, range: 10, attackSpeed: 2.5, cost: 0, canTargetAir: false, isFlying: false, deployTime: 0, targets: 'buildings' },
        spear_goblin_unit: { type: 'troop_hidden', name: 'Spear Goblins', icon: '👺', size: 20, hp: 133, dmg: 80, speed: 1.8, range: 150, attackSpeed: 1.1, cost: 0, isRanged: true, projectileColor: 'brown', canTargetAir: true, isFlying: false, deployTime: 60 },
        minion_unit: { type: 'troop_hidden', name: 'Minions', icon: '👿', size: 24, hp: 215, dmg: 100, speed: 1.4, range: 10, attackSpeed: 1.0, cost: 0, canTargetAir: true, isFlying: true, deployTime: 60 },
    };
    const STATS = MASTER_CARD_LIST;

    
    // --- Deck Builder Logic ---
    function initializeDeckBuilder() {
        cardCollectionContainer.innerHTML = ''; // Clear previous
        
        for (const cardType in MASTER_CARD_LIST) {
            const stats = MASTER_CARD_LIST[cardType];
            if (stats.type === 'troop_hidden') continue;
            
            const card = document.createElement('div');
            card.classList.add('deck-builder-card');
            card.dataset.card = cardType;
            
            card.innerHTML = `
                <div class="card-cost">${stats.cost}</div>
                <div class="card-icon">${stats.icon}</div>
                <div class="card-name">${stats.displayName}</div>
            `;
            
            card.addEventListener('click', () => toggleCardInDeck(card, cardType));
            card.addEventListener('mouseover', () => showCardStats(cardType));
            card.addEventListener('mouseout', () => clearCardStats());
            
            cardCollectionContainer.appendChild(card);
        }
        
        updateDeckBuilderCounters(); // Set initial text
    }

    function toggleCardInDeck(cardElement, cardType) {
        const isSelected = cardElement.classList.contains('selected');
        
        if (isSelected) {
            cardElement.classList.remove('selected');
            playerDeck = playerDeck.filter(c => c !== cardType);
        } else {
            if (playerDeck.length < 8) {
                cardElement.classList.add('selected');
                playerDeck.push(cardType);
            }
        }
        updateDeckBuilderCounters();
    }
    
    function updateDeckBuilderCounters() {
        // Update count
        deckCounter.textContent = `Select 8 Cards (${playerDeck.length} / 8)`;
        confirmDeckButton.disabled = (playerDeck.length !== 8);

        // Update average cost
        let totalCost = 0;
        for (const cardType of playerDeck) {
            totalCost += MASTER_CARD_LIST[cardType].cost;
        }
        const averageCost = (playerDeck.length > 0) ? (totalCost / playerDeck.length).toFixed(1) : 0.0;
        averageCostDisplay.textContent = `Average Cost: ${averageCost}`;
    }

    function showCardStats(cardType) {
        const stats = MASTER_CARD_LIST[cardType];
        
        let html = `<h2>${stats.displayName}</h2>`;
        html += `<p><span class="stat-name">Cost:</span> ${stats.cost}</p>`;
        html += `<p><span class="stat-name">Type:</span> ${stats.type.toUpperCase()}</p>`;
        
        if (stats.type === 'troop') {
            html += `<p><span class="stat-name">HP:</span> ${stats.hp}</p>`;
            html += `<p><span class="stat-name">Damage:</span> ${stats.dmg}</p>`;
            html += `<p><span class="stat-name">Speed:</span> ${stats.speed}</p>`;
            html += `<p><span class="stat-name">Attack Speed:</span> ${stats.attackSpeed}s</p>`;
            html += `<p><span class="stat-name">Range:</span> ${stats.range}</p>`;
            if (stats.targets === 'buildings') {
                html += `<p><span class="stat-name">Targets:</span> Buildings</p>`;
            }
        } else if (stats.type === 'building') {
            html += `<p><span class="stat-name">HP:</span> ${stats.hp}</p>`;
            html += `<p><span class="stat-name">Lifetime:</span> ${(stats.lifetime / 60).toFixed(1)}s</p>`;
            if(stats.isAttacker) {
                 html += `<p><span class="stat-name">Damage:</span> ${stats.dmg}</p>`;
                 html += `<p><span class="stat-name">Attack Speed:</span> ${stats.attackSpeed}s</p>`;
            }
            if (stats.spawnType) {
                html += `<p><span class="stat-name">Spawn Speed:</span> ${(stats.spawnRate / 60).toFixed(1)}s</p>`;
            }
        } else if (stats.type === 'spell') {
            if (stats.damage) html += `<p><span class="stat-name">Damage:</span> ${stats.damage}</p>`;
            if (stats.stunFrames) html += `<p><span class="stat-name">Stun:</span> ${stats.stunFrames / 60}s</p>`;
            if (stats.knockback) html += `<p><span class="stat-name">Knockback:</span> Yes</p>`;
            if (stats.duration) html += `<p><span class="stat-name">Duration:</span> ${stats.duration / 60}s</p>`;
            if (stats.troopDmgPerFrame) html += `<p><span class="stat-name">Troop DPS:</span> ${(stats.troopDmgPerFrame * 60).toFixed(0)}</p>`;
            if (stats.buildingDmgPerFrame) html += `<p><span class="stat-name">Tower DPS:</span> ${(stats.buildingDmgPerFrame * 60).toFixed(0)}</p>`;
        }
        
        if (stats.deathSpawn) html += `<p><span class="stat-name">Death Spawn:</span> 2x Golemites</p>`;
        if (stats.deathBombStats) html += `<p><span class="stat-name">Death Bomb:</span> ${stats.deathBombStats.damage} dmg</p>`;
        if (stats.slowFrames) html += `<p><span class="stat-name">Slows:</span> 35% for ${stats.slowFrames / 60}s</p>`;

        statDisplay.innerHTML = html;
    }

    function clearCardStats() {
        statDisplay.innerHTML = `
            <h2>Card Stats</h2>
            <p>Hover over a card to see its stats.</p>
        `;
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
            const stats = STATS[cardType];
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
                const stats = STATS[cardType];
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
        constructor(x, y, team, name, hp, dmg, attackSpeed, range, isKingTower = false) {
            this.x = x; this.y = y; 
            this.width = (isKingTower ? 50 : 40); 
            this.height = (isKingTower ? 90 : 80); 
            this.team = team; this.name = name; this.hp = hp; this.currentHP = this.hp;
            this.dmg = dmg;
            this.attackSpeed = attackSpeed;
            this.range = range; 
            this.isKingTower = isKingTower;
            this.isKingTowerActive = !isKingTower; 
            
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

    // --- NEW: Building Class (for Goblin Hut, Cannon) ---
    class Building {
        constructor(type, x, y, team) {
            Object.assign(this, STATS[type]);
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
                units.push(new Unit(this.spawnType, this.centerX, this.centerY, this.team));
            }
            
            // Attack (if it's an attacker)
            if (this.isAttacker) {
                if (!this.target || this.target.currentHP <= 0) { this.findTarget(); }
                if (this.target) {
                    const distance = Math.sqrt(Math.pow(this.target.centerX - this.centerX, 2) + Math.pow(this.target.centerY - this.centerY, 2));
                    if (distance <= this.range) {
                        if (gameTime - this.lastAttackTime >= (currentAttackSpeed * 60)) {
                            projectiles.push(new Projectile(this.centerX, this.centerY, this.target, this.dmg, 'gray'));
                            this.lastAttackTime = gameTime;
                        }
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

    // --- Projectile Class (For Archers, Zappies, Ice Wizard) ---
    class Projectile {
        constructor(startX, startY, target, damage, color = 'yellow', stunFrames = 0, slowFrames = 0) {
            this.x = startX; this.y = startY; this.target = target;
            this.damage = damage; this.speed = 10; this.size = 5; this.color = color;
            this.stunFrames = stunFrames;
            this.slowFrames = slowFrames;
        }

        update() {
            if (!this.target || this.target.currentHP <= 0) { return true; }
            const targetX = this.target.centerX; const targetY = this.target.centerY;
            const dx = targetX - this.x; const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.speed) { 
                this.target.currentHP -= this.damage; 
                // Activate King Tower if hit
                if (this.target.isKingTower) { this.target.isKingTowerActive = true; }
                
                if (this.stunFrames) { this.target.isFrozen = this.stunFrames; }
                if (this.slowFrames) { this.target.isSlowed = this.slowFrames; }
                return true; 
            }
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
            return false;
        }

        draw() {
            ctx.fillStyle = this.color; ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    // --- Spell Projectile Class (For Fireball, Rocket) ---
    class SpellProjectile {
        constructor(startX, startY, targetX, targetY, stats, team) {
            this.x = startX;
            this.y = startY;
            this.targetX = targetX;
            this.targetY = targetY;
            this.stats = stats;
            this.team = team;
            this.speed = (canvas.width / stats.travelTime);
            this.icon = stats.icon;
        }
        
        update() {
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.speed) {
                applySpellEffects(this.targetX, this.targetY, this.stats, this.team);
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

    // --- NEW: Lingering Spell Class (for Earthquake) ---
    class SpellEffectArea {
        constructor(x, y, stats, team) {
            this.x = x; this.y = y; this.stats = stats; this.team = team;
            this.duration = stats.duration;
        }
        
        update() {
            this.duration--;
            if (this.duration <= 0) return true; // Destroy
            
            // Damage targets
            const targets = [...units, ...towers, ...buildings];
            for (const target of targets) {
                if (target.team === this.team || target.currentHP <= 0) continue;
                
                const distance = Math.sqrt(Math.pow(target.centerX - this.x, 2) + Math.pow(target.centerY - this.y, 2));
                
                // --- THIS IS THE FIX ---
                const targetSize = target.size || target.width || 0; // Use .size, or .width for Towers
                if (distance <= this.stats.aoeRadius + (targetSize / 2)) {
                // --- END FIX ---
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
            // Draw a pulsing brown circle
            const opacity = 0.3 + (Math.sin(gameTime / 5) * 0.2);
            ctx.fillStyle = `rgba(139, 69, 19, ${opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.stats.aoeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // --- NEW: Death Bomb Class (for Giant Skeleton) ---
    class DeathBomb {
        constructor(x, y, stats, team) {
            this.x = x; this.y = y; this.stats = stats; this.team = team;
            this.timer = stats.timer;
        }
        
        update() {
            this.timer--;
            if (this.timer <= 0) {
                applySpellEffects(this.x, this.y, this.stats, this.team);
                return true; // Destroy
            }
            return false;
        }
        
        draw() {
            // Draw a flashing bomb
            const icon = '💣';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            if (this.timer % 20 < 10) { // Flash
                ctx.fillText(icon, this.x, this.y);
            }
        }
    }
    
    // --- Global function to apply spell AOE damage/effects ---
    function applySpellEffects(x, y, stats, team) {
        spellEffects.push(new SpellVisual(x, y, stats.aoeRadius));
        const targets = [...units, ...towers, ...buildings]; 
        
        for (const target of targets) {
            if (target.team === team || target.currentHP <= 0) continue; 
            
            const distance = Math.sqrt(Math.pow(target.centerX - x, 2) + Math.pow(target.centerY - y, 2));
            
            // --- THIS IS THE FIX ---
            const targetSize = target.size || target.width || 0; // Use .size, or .width for Towers
            if (distance <= stats.aoeRadius + (targetSize / 2)) {
            // --- END FIX ---
                if (stats.damage) {
                    target.currentHP -= stats.damage;
                    if (target.isKingTower) { target.isKingTowerActive = true; } // Activate king
                }
                if (stats.stunFrames) {
                    target.isFrozen = stats.stunFrames;
                }
                if (stats.knockback) {
                    target.applyKnockback(stats.knockback, x, y);
                }
            }
        }
    }


    // --- Base Unit Class ---
    class Unit {
        constructor(type, x, y, team) { 
            Object.assign(this, STATS[type]);
            this.x = x; this.y = y; this.team = team; 
            this.currentHP = this.hp; this.lastAttackTime = 0;
            this.target = null; this.isFrozen = 0; 
            this.isSlowed = 0; 
            this.drawColor = team === 'blue' ? 'rgba(0, 0, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            this.deployTimer = this.deployTime || 0; 
            this.bridgeTarget = null; // --- NEW: For pathfinding
        }

        get centerX() { return this.x + this.size / 2; }
        get centerY() { return this.y + this.size / 2; }
        get isBuilding() { return false; }

        applyKnockback(force, blastX, blastY) {
            const dx = this.centerX - blastX;
            const dy = this.centerY - blastY;
            const dist = Math.max(1, Math.sqrt(dx*dx + dy*dy)); 
            
            this.x += (dx / dist) * force;
            this.y += (dy / dist) * force;
            
            this.target = null;
        }

        findTarget() {
            let potentialTargets;
            // --- MODIFIED: Target buildings too ---
            if (this.targets === 'buildings') {
                const enemyTowers = towers.filter(t => t.team !== this.team && t.currentHP > 0);
                const enemyBuildings = buildings.filter(b => b.team !== this.team && b.currentHP > 0);
                potentialTargets = enemyTowers.concat(enemyBuildings);
            } else {
                const enemies = units.filter(u => u.team !== this.team && u.currentHP > 0);
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
            if (this.currentHP <= 0) return;
            
            if (this.deployTimer > 0) {
                this.deployTimer--;
                return; // Do not move, attack, or find target
            }
            
            if (this.isFrozen > 0) { this.isFrozen = Math.max(0, this.isFrozen - 1); return; }
            if (this.isSlowed > 0) { this.isSlowed = Math.max(0, this.isSlowed - 1); }
            
            if (this.name === 'Witch' && gameTime - (this.lastSpawnTime || 0) >= this.spawnRate) {
                this.lastSpawnTime = gameTime;
                units.push(new Unit('skeleton', this.x, this.y - this.size, this.team));
                units.push(new Unit('skeleton', this.x, this.y + this.size, this.team));
                units.push(new Unit('skeleton', this.x - this.size, this.y, this.team));
                units.push(new Unit('skeleton', this.x + this.size, this.y, this.team));
            }

            if (!this.target || this.target.currentHP <= 0) { this.findTarget(); }
            if (this.target) {
                const distance = Math.sqrt(Math.pow(this.target.centerX - this.centerX, 2) + Math.pow(this.target.centerY - this.centerY, 2));
                const effectiveRange = (this.size / 2) + (this.target.width || this.target.size || 0) / 2 + this.range;
                
                // --- MODIFIED: Check for slow ---
                let currentSpeed = this.speed;
                let currentAttackSpeed = this.attackSpeed;
                if (this.isSlowed > 0) {
                    currentSpeed *= 0.65; // 35% slow
                    currentAttackSpeed *= 1.35; // 35% slower
                }

                if (distance <= effectiveRange) {
                    if (gameTime - this.lastAttackTime >= (currentAttackSpeed * 60)) { // Converted to frames
                        if (this.isRanged) {
                            // --- MODIFIED: Pass stun/slow effects to projectile ---
                            projectiles.push(new Projectile(
                                this.centerX, this.centerY, 
                                this.target, this.dmg, 
                                this.projectileColor || 'yellow', 
                                this.stunFrames || 0, 
                                this.slowFrames || 0
                            ));
                        } else {
                            this.target.currentHP -= this.dmg;
                            // --- NEW: Activate King Tower on hit ---
                            if (this.target.isKingTower) { this.target.isKingTowerActive = true; }
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
                    // --- NEW: Pathfinding Logic ---
                    let moveTargetX = this.target.centerX;
                    let moveTargetY = this.target.centerY;
                    
                    if (!this.isFlying) {
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
                    const moveDistance = Math.sqrt(dx*dx + dy*dy);
                    
                    this.x += (dx / moveDistance) * currentSpeed;
                    this.y += (dy / moveDistance) * currentSpeed;
                }
            }
        }

        draw() {
            if (this.deployTimer > 0 && gameTime % 10 < 5) {
                return; // Flicker by skipping draw
            }

            ctx.fillStyle = this.drawColor;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = `${this.size * 0.8}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icon, this.centerX, this.centerY);
            const healthRatio = this.currentHP / this.hp;
            ctx.fillStyle = healthRatio > 0.5 ? 'green' : (healthRatio > 0.2 ? 'orange' : 'red');
            ctx.fillRect(this.x, this.y - 5, this.size * healthRatio, 3);
            if (this.isFrozen > 0) {
                ctx.fillStyle = 'cyan'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('❄️', this.x + this.size/2, this.y - 10);
            } else if (this.isSlowed > 0) {
                ctx.fillStyle = 'lightblue'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
                ctx.fillText('💧', this.x + this.size/2, this.y - 10);
            }
        }
    }

    // --- NEW: Initialize Towers with Level 11 Stats ---
    const towers = [
        // (x, y, team, name, hp, dmg, attackSpeed, range, isKingTower)
        new Tower(30, 150, 'blue', 'Player King', 4008, 98, 1.0, 180, true), 
        new Tower(80, 75, 'blue', 'Player Princess', 2534, 111, 0.8, 200, false),
        new Tower(80, 225, 'blue', 'Player Princess', 2534, 111, 0.8, 200, false), 
        new Tower(570, 150, 'red', 'Enemy King', 4008, 98, 1.0, 180, true),
        new Tower(520, 75, 'red', 'Enemy Princess', 2534, 111, 0.8, 200, false), 
        new Tower(520, 225, 'red', 'Enemy Princess', 2534, 111, 0.8, 200, false)
    ];

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
                if (playerCrowns > enemyCrowns) {
                    gameState = 'ended'; elixirMessage = "PLAYER VICTORY!";
                } else if (enemyCrowns > playerCrowns) {
                    gameState = 'ended'; elixirMessage = "ENEMY VICTORY!";
                } else {
                    gameState = 'overtime'; elixirMessage = "OVERTIME: 3x ELIXIR!";
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
            if (cardStats.type === 'troop' || cardStats.type === 'building') {
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
        
        if (gameTime % 60 === 0) { updateGameState(); }
        updateElixir();
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
            
            if (unit.currentHP <= 0) {
                if (unit.deathSpawn) {
                    const spawnType = unit.deathSpawn;
                    units.push(new Unit(spawnType, unit.x - 10, unit.y, unit.team));
                    units.push(new Unit(spawnType, unit.x + 10, unit.y, unit.team));
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
        if (playerCrowns >= 3 || (gameState === 'ended' && playerCrowns > enemyCrowns)) {
            ctx.fillStyle = 'black';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PLAYER VICTORY!', canvas.width / 2, canvas.height / 2);
            gameState = 'ended'; 
            replayButton.style.display = 'block'; // --- NEW: Show replay button
            return;
        }
        
        if (enemyCrowns >= 3 || (gameState === 'ended' && enemyCrowns > playerCrowns)) {
            ctx.fillStyle = 'black';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ENEMY VICTORY!', canvas.width / 2, canvas.height / 2);
            gameState = 'ended'; 
            replayButton.style.display = 'block'; // --- NEW: Show replay button
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

        if (gameState !== 'ended') {
            requestAnimationFrame(gameLoop);
        }
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
                hoverSymbol.innerHTML = STATS[cardType].icon;
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
        const cardStats = STATS[unitType];
        const cardCost = cardStats.cost;

        if (playerElixir < cardCost) { return; }
        
        // Find spawn location
        const tileX = Math.floor(clickX / TILE_SIZE);
        const tileY = Math.floor(clickY / TILE_SIZE);
        const spawnX_center = (tileX * TILE_SIZE) + (TILE_SIZE / 2);
        const spawnY_center = (tileY * TILE_SIZE) + (TILE_SIZE / 2);
        const spawnX = spawnX_center - (cardStats.size || 0) / 2;
        const spawnY = spawnY_center - (cardStats.size || 0) / 2;
        
        // --- MODIFIED: Handle all card types ---
        
        const deploymentZoneMaxX = canvas.width / 2 - 10; 
        
        if (cardStats.type === 'troop') {
            if (clickX > deploymentZoneMaxX) { 
                console.log("Can only deploy troops on your side!");
                return; 
            }
            playerElixir -= cardCost;
            
            // --- MODIFIED: New multi-spawn logic ---
            if (unitType === 'archer') {
                units.push(new Unit('archer', spawnX - 5, spawnY, 'blue')); 
                units.push(new Unit('archer', spawnX + 5, spawnY, 'blue')); 
            } else if (unitType === 'skeleton') {
                units.push(new Unit('skeleton', spawnX, spawnY, 'blue')); 
                units.push(new Unit('skeleton', spawnX - 10, spawnY - 5, 'blue')); 
                units.push(new Unit('skeleton', spawnX + 10, spawnY + 5, 'blue')); 
            } else if (unitType === 'barbarians') {
                units.push(new Unit('barbarians', spawnX, spawnY, 'blue'));
                units.push(new Unit('barbarians', spawnX - 10, spawnY - 10, 'blue'));
                units.push(new Unit('barbarians', spawnX + 10, spawnY - 10, 'blue'));
                units.push(new Unit('barbarians', spawnX - 10, spawnY + 10, 'blue'));
                units.push(new Unit('barbarians', spawnX + 10, spawnY + 10, 'blue'));
            } else if (unitType === 'spear_goblins') {
                units.push(new Unit('spear_goblins', spawnX, spawnY, 'blue')); 
                units.push(new Unit('spear_goblins', spawnX - 10, spawnY - 5, 'blue')); 
                units.push(new Unit('spear_goblins', spawnX + 10, spawnY + 5, 'blue')); 
            } else if (unitType === 'zappies') {
                units.push(new Unit('zappies', spawnX, spawnY, 'blue')); 
                units.push(new Unit('zappies', spawnX - 10, spawnY - 5, 'blue')); 
                units.push(new Unit('zappies', spawnX + 10, spawnY + 5, 'blue')); 
            } else if (unitType === 'bats') {
                units.push(new Unit('bats', spawnX, spawnY, 'blue')); 
                units.push(new Unit('bats', spawnX - 10, spawnY - 5, 'blue')); 
                units.push(new Unit('bats', spawnX + 10, spawnY + 5, 'blue')); 
                units.push(new Unit('bats', spawnX - 5, spawnY + 5, 'blue')); 
                units.push(new Unit('bats', spawnX + 5, spawnY - 5, 'blue')); 
            } else if (unitType === 'goblins') {
                units.push(new Unit('goblins', spawnX, spawnY, 'blue')); 
                units.push(new Unit('goblins', spawnX - 10, spawnY - 5, 'blue')); 
                units.push(new Unit('goblins', spawnX + 10, spawnY + 5, 'blue')); 
            } else if (unitType === 'minions') {
                units.push(new Unit('minions', spawnX, spawnY, 'blue')); 
                units.push(new Unit('minions', spawnX - 10, spawnY - 5, 'blue')); 
                units.push(new Unit('minions', spawnX + 10, spawnY + 5, 'blue')); 
            } else if (unitType === 'minion_horde') {
                units.push(new Unit('minion_unit', spawnX - 10, spawnY - 10, 'blue')); 
                units.push(new Unit('minion_unit', spawnX + 10, spawnY - 10, 'blue')); 
                units.push(new Unit('minion_unit', spawnX - 10, spawnY + 10, 'blue')); 
                units.push(new Unit('minion_unit', spawnX + 10, spawnY + 10, 'blue')); 
                units.push(new Unit('minion_unit', spawnX - 20, spawnY, 'blue')); 
                units.push(new Unit('minion_unit', spawnX + 20, spawnY, 'blue')); 
            } else if (unitType === 'elite_barbarians') {
                units.push(new Unit('elite_barbarians', spawnX - 5, spawnY, 'blue')); 
                units.push(new Unit('elite_barbarians', spawnX + 5, spawnY, 'blue')); 
            } else {
                const newUnit = new Unit(unitType, spawnX, spawnY, 'blue'); 
                units.push(newUnit);
            }

        } else if (cardStats.type === 'building') {
            if (clickX > deploymentZoneMaxX) { 
                console.log("Can only deploy buildings on your side!");
                return; 
            }
            playerElixir -= cardCost;
            buildings.push(new Building(unitType, spawnX, spawnY, 'blue'));

        } else if (cardStats.type === 'spell') {
            playerElixir -= cardCost;
            
            if (cardStats.travelTime === 0) {
                // INSTANT spell (Zap, Snowball, Earthquake)
                if (cardStats.duration > 0) {
                    spellAreas.push(new SpellEffectArea(clickX, clickY, cardStats, 'blue'));
                } else {
                    applySpellEffects(clickX, clickY, cardStats, 'blue');
                }
            } else {
                // TRAVEL-TIME spell (Fireball, Rocket)
                const kingTower = towers.find(t => t.team === 'blue' && t.name.includes('King'));
                spellProjectiles.push(new SpellProjectile(kingTower.centerX, kingTower.centerY, clickX, clickY, cardStats, 'blue'));
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
            
            const spawnX_random = Math.random() * (canvas.width / 2 - (cardStats.size || 20) - 10) + (canvas.width / 2 + 10);
            const spawnY_random = Math.random() * (canvas.height - (cardStats.size || 20) - 10) + 5;
            
            const tileX = Math.floor(spawnX_random / TILE_SIZE);
            const tileY = Math.floor(spawnY_random / TILE_SIZE);
            const spawnX_center = (tileX * TILE_SIZE) + (TILE_SIZE / 2);
            const spawnY_center = (tileY * TILE_SIZE) + (TILE_SIZE / 2);
            
            const spawnX = spawnX_center - (cardStats.size || 0) / 2;
            const spawnY = spawnY_center - (cardStats.size || 0) / 2;

            
            if (cardStats.type === 'troop') {
                // --- BOT MULTI-SPAWN FIX ---
                if (cardType === 'archer') {
                    units.push(new Unit('archer', spawnX - 5, spawnY, 'red')); 
                    units.push(new Unit('archer', spawnX + 5, spawnY, 'red')); 
                } else if (cardType === 'skeleton') {
                    units.push(new Unit('skeleton', spawnX, spawnY, 'red')); 
                    units.push(new Unit('skeleton', spawnX - 10, spawnY - 5, 'red')); 
                    units.push(new Unit('skeleton', spawnX + 10, spawnY + 5, 'red')); 
                } else if (cardType === 'barbarians') {
                    units.push(new Unit('barbarians', spawnX, spawnY, 'red')); 
                    units.push(new Unit('barbarians', spawnX - 10, spawnY - 10, 'red')); 
                    units.push(new Unit('barbarians', spawnX + 10, spawnY - 10, 'red')); 
                    units.push(new Unit('barbarians', spawnX - 10, spawnY + 10, 'red')); 
                    units.push(new Unit('barbarians', spawnX + 10, spawnY + 10, 'red')); 
                } else if (cardType === 'spear_goblins') {
                    units.push(new Unit('spear_goblins', spawnX, spawnY, 'red')); 
                    units.push(new Unit('spear_goblins', spawnX - 10, spawnY - 5, 'red')); 
                    units.push(new Unit('spear_goblins', spawnX + 10, spawnY + 5, 'red')); 
                } else if (cardType === 'zappies') {
                    units.push(new Unit('zappies', spawnX, spawnY, 'red')); 
                    units.push(new Unit('zappies', spawnX - 10, spawnY - 5, 'red')); 
                    units.push(new Unit('zappies', spawnX + 10, spawnY + 5, 'red')); 
                } else if (cardType === 'bats') {
                    units.push(new Unit('bats', spawnX, spawnY, 'red')); 
                    units.push(new Unit('bats', spawnX - 10, spawnY - 5, 'red')); 
                    units.push(new Unit('bats', spawnX + 10, spawnY + 5, 'red')); 
                    units.push(new Unit('bats', spawnX - 5, spawnY + 5, 'red')); 
                    units.push(new Unit('bats', spawnX + 5, spawnY - 5, 'red')); 
                } else if (cardType === 'goblins') {
                    units.push(new Unit('goblins', spawnX, spawnY, 'red')); 
                    units.push(new Unit('goblins', spawnX - 10, spawnY - 5, 'red')); 
                    units.push(new Unit('goblins', spawnX + 10, spawnY + 5, 'red')); 
                } else if (cardType === 'minions') {
                    units.push(new Unit('minions', spawnX, spawnY, 'red')); 
                    units.push(new Unit('minions', spawnX - 10, spawnY - 5, 'red')); 
                    units.push(new Unit('minions', spawnX + 10, spawnY + 5, 'red')); 
                } else if (cardType === 'minion_horde') {
                    units.push(new Unit('minion_unit', spawnX - 10, spawnY - 10, 'red')); 
                    units.push(new Unit('minion_unit', spawnX + 10, spawnY - 10, 'red')); 
                    units.push(new Unit('minion_unit', spawnX - 10, spawnY + 10, 'red')); 
                    units.push(new Unit('minion_unit', spawnX + 10, spawnY + 10, 'red')); 
                    units.push(new Unit('minion_unit', spawnX - 20, spawnY, 'red')); 
                    units.push(new Unit('minion_unit', spawnX + 20, spawnY, 'red')); 
                } else if (cardType === 'elite_barbarians') {
                    units.push(new Unit('elite_barbarians', spawnX - 5, spawnY, 'red')); 
                    units.push(new Unit('elite_barbarians', spawnX + 5, spawnY, 'red')); 
                } else {
                    const newUnit = new Unit(cardType, spawnX, spawnY, 'red'); 
                    units.push(newUnit);
                }
                
            } else if (cardStats.type === 'building') {
                 buildings.push(new Building(cardType, spawnX, spawnY, 'red'));
                 
            } else if (cardStats.type === 'spell') {
                const playerTargets = [...units, ...towers, ...buildings].filter(t => t.team === 'blue' && t.currentHP > 0);
                if (playerTargets.length > 0) {
                    const target = playerTargets[Math.floor(Math.random() * playerTargets.length)];
                    
                    if (cardStats.travelTime === 0) {
                        if (cardStats.duration > 0) {
                            spellAreas.push(new SpellEffectArea(target.centerX, target.centerY, cardStats, 'red'));
                        } else {
                            applySpellEffects(target.centerX, target.centerY, cardStats, 'red');
                        }
                    } else {
                        const kingTower = towers.find(t => t.team === 'red' && t.name.includes('King'));
                        spellProjectiles.push(new SpellProjectile(kingTower.centerX, kingTower.centerY, target.centerX, target.centerY, cardStats, 'red'));
                    }
                }
            }
        }
    }

    // --- START GAME LOGIC ---
    
    // 1. Show Intro Modal
    initializeDeckBuilder(); 
    
    // 2. Handle "Build Deck" click
    startBuildButton.addEventListener('click', () => {
        introModal.style.display = 'none';
        deckBuilderModal.style.display = 'flex';
    });
    
    // 3. Handle "Confirm Deck" click
    confirmDeckButton.addEventListener('click', () => {
        fullDeck = [...playerDeck]; // Set the 8 cards for the match
        deckBuilderModal.style.display = 'none';
        difficultyModal.style.display = 'flex';
    });
    
    // 3b. Handle "Randomize Deck" click
    randomizeDeckButton.addEventListener('click', () => {
        const allCardTypes = shuffleDeck(Object.keys(MASTER_CARD_LIST).filter(c => MASTER_CARD_LIST[c].type !== 'troop_hidden'));
        playerDeck = allCardTypes.slice(0, 8); // Get 8 random cards

        // Update the visual selection
        const allCardElements = document.querySelectorAll('.deck-builder-card');
        allCardElements.forEach(cardElement => {
            if (playerDeck.includes(cardElement.dataset.card)) {
                cardElement.classList.add('selected');
            } else {
                cardElement.classList.remove('selected');
            }
        });

        // Update the counters
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

            difficultyModal.style.display = 'none';
            
            // --- THIS IS THE FIX ---
            gameContainer.style.display = 'inline-block';
            handContainer.style.display = 'inline-block'; // Set to inline-block
            
            // Re-apply the flex rules that the CSS is now missing
            handContainer.style.flexDirection = 'column'; 
            handContainer.style.alignItems = 'center'; 

            // --- Setup the Player's deck ---
            drawPile = shuffleDeck([...fullDeck]); 
            discardPile = [];
            for (let i = 0; i < 4; i++) { 
                drawCard();
            }
            
            // --- Create a random 8-card deck for the AI ---
            const allCardTypes = shuffleDeck(Object.keys(MASTER_CARD_LIST).filter(c => MASTER_CARD_LIST[c].type !== 'troop_hidden'));
            enemyDeck = allCardTypes.slice(0, 8); 

            enemySpawnInterval = setInterval(spawnEnemy, enemySpawnRate);
            
            gameLoop();
        });
    });

}); // --- END OF DOMCONTENTLOADED WRAPPER ---