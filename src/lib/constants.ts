export const CURSOR_R = 12; // radius of the invisible player circle following the mouse pointer
export const CHASER_R = 18; // radius of the enemy that chases the cursor
export const CHASER_SPEED_BASE = 250; // px/sec
export const CHASER_SPEED_PER_POINT = 6; // small speed ramp per score
export const TARGET_MIN_R = 8;
export const TARGET_MAX_R = 16;
export const SPAWN_MIN = 0.6; // seconds
export const SPAWN_MAX = 1; // seconds
export const SAFE_RADIUS = 120; // don't spawn targets too close to player or chaser
export const CURSOR_VISUAL_MAX_WIDTH = 768;
export const ORB_PULSE_AMPLITUDE = 0.15; // ±15% size
export const ORB_PULSE_SPEED = 2.5; // radians/sec
export const ORB_GLOW_MULTIPLIER = 1.8; // halo size vs current radius

// Particle system
export const PARTICLE_LIFETIME = 1; // seconds
export const PARTICLE_SIZE = 9; // base radius
export const PARTICLE_PER_FRAME = 1; // how many spawn per entity per frame

// Game audio
export const HIGHSCORE_KEY = "cursorchase.highscore";
export const NEW_HIGHSCORE_SFX_URL = "/audio/new-highscore.mp3";
export const NOT_BEST_SFX_URL = "/audio/game-over.mp3";
export const HIGHSCORE_SFX_VOL = 0.9;

// Golden orbs
export const GOLDEN_ORB_CHANCE = 0.08; // 8% of spawns
export const GOLDEN_ORB_POINTS = 5; // score value
export const GOLDEN_ORB_COLOR = "#ffd54a"; // warm gold
export const GOLDEN_GLOW_BOOST = 1.25; // bigger halo vs normal
