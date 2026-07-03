/**
 * HCL Hub Centralized Data Architecture & State Engine
 * Version 3.0.0 (Unified Core Controller)
 * * Instructions:
 * 1. Save this entire script as 'hcl-core.js' in your project root.
 * 2. Link <script src="hcl-core.js"></script> before page-specific scripts.
 * 3. Use HCL_HUB.onReady(hub => { ... }) to construct UI layouts safely.
 */

(function (window) {
    'use strict';

    // 1. Unified Immutable Storage Endpoints
    const ENDPOINTS = {
        SCHEDULE: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWLzMxExK_CHV8x6uGcYFuDTKIaIfQIFMMrDz89AbrbBtgt4E22U8lmMyr-p3F-_cZcGPmm1qJSSYN/pub?gid=242746494&single=true&output=csv",
        STANDINGS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWLzMxExK_CHV8x6uGcYFuDTKIaIfQIFMMrDz89AbrbBtgt4E22U8lmMyr-p3F-_cZcGPmm1qJSSYN/pub?gid=492816603&single=true&output=csv",
        TEAMS: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWLzMxExK_CHV8x6uGcYFuDTKIaIfQIFMMrDz89AbrbBtgt4E22U8lmMyr-p3F-_cZcGPmm1qJSSYN/pub?gid=0&single=true&output=csv",
        ROSTER: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRWLzMxExK_CHV8x6uGcYFuDTKIaIfQIFMMrDz89AbrbBtgt4E22U8lmMyr-p3F-_cZcGPmm1qJSSYN/pub?gid=1582236894&single=true&output=csv"
    };

    // 2. Centralized In-Memory Database State
    let _state = {
        isReady: false,
        teams: {},      // Indexed relational object mapping { CODE: { name, color, players: [] } }
        schedule: [],   // Array of structured Match Objects
        standings: [],  // Array of ranked Leaderboard Objects
        players: [],    // Master Array containing every global league player card
        listeners: []   // Module callbacks executed when data layer is populated
    };

    // 3. High-Fidelity RFC 4180 Compliant CSV String Engine
    function parseCSV(text) {
        let lines = text.split(/\r\n|\n/);
        return lines.filter(line => line.trim().length > 0).map(line => {
            let result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                let char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });
    }

    // 4. Low-Level Asynchronous Stream Ingestion Pipeline
    async function secureFetch(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP network error code: ${response.status}`);
            const text = await response.text();
            return parseCSV(text);
        } catch (error) {
            console.error(`[HCL Core Fail] Data retrieval execution halted for endpoint:`, error);
            return [];
        }
    }

    // 5. Normalization Helpers for Clean Strings/Numbers Extraction
    function parseRating(str) {
        if (!str) return 0;
        let match = str.match(/\((\d+)\)/);
        return match ? parseInt(match[1], 10) : parseInt(str, 10) || 0;
    }

    function extractTeamCode(str) {
        if (!str || str.toLowerCase() === 'unassigned') return null;
        let match = str.match(/\[([A-Z0-9]+)\]/i);
        return match ? match[1].toUpperCase().trim() : str.substring(0, 3).toUpperCase().trim();
    }

    function cleanPosition(str) {
        if (!str) return 'MID';
        let match = str.match(/\[([A-Z]+)\]/i);
        return match ? match[1].toUpperCase().trim() : str.toUpperCase().replace(/[^A-Z]/g, '');
    }

    // 6. Relational Data Mapping & Linking Engines
    function processTeams(rawRows) {
        rawRows.forEach((row, idx) => {
            if (idx === 0 || !row[1]) return;
            const code = row[1].toUpperCase().trim();
            _state.teams[code] = {
                name: row[0],
                code: code,
                manager: row[2] || 'TBD',
                color: row[3] || '#64748b',
                players: [] // Relational array filled out during player loop execution
            };
        });
    }

    function processRosters(rawRows) {
        // Formats: PLAYER ID, PLAYER NAME, POSITION, ASSIGNED TEAM, OFFENSE RATING, DEFENSE RATING, WEEKLY COST
        _state.players = rawRows.slice(1).filter(row => row[0]).map(row => {
            const rawCost = parseInt(row[6], 10) || 0;
            const targetTeamCode = extractTeamCode(row[3]);
            
            const playerCard = {
                id: row[0].padStart(4, '0'),
                name: row[1],
                pos: cleanPosition(row[2]),
                displayPos: row[2], 
                teamCode: targetTeamCode,
                teamName: targetTeamCode && _state.teams[targetTeamCode] ? _state.teams[targetTeamCode].name : null,
                off: parseRating(row[4]),
                def: parseRating(row[5]),
                cost: rawCost,
                costStr: rawCost > 0 ? `$${rawCost.toLocaleString()}` : 'Free'
            };

            // Inject structural backlink directly into parent team profile if assigned
            if (targetTeamCode && _state.teams[targetTeamCode]) {
                _state.teams[targetTeamCode].players.push(playerCard);
            }

            return playerCard;
        });
    }

    function processSchedule(rawRows) {
        _state.schedule = rawRows.slice(1).filter(row => row[0]).map(row => {
            const hName = row[4] || '';
            const aName = row[6] || '';
            let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            let match = row[8] ? row[8].match(regExp) : null;
            let ytId = (match && match[2].length === 11) ? match[2] : null;

            return {
                week: parseInt(row[0], 10),
                date: row[1],
                time: row[2],
                status: row[3] ? row[3].toUpperCase().trim() : 'UPCOMING',
                homeName: hName,
                homeCode: hName.match(/^[A-Z]{3,4}\s/i) ? hName.split(' ')[0].toUpperCase() : hName.substring(0,3).toUpperCase(),
                homeScore: row[5] !== "" && row[5] !== undefined ? parseInt(row[5], 10) : null,
                awayName: aName,
                awayCode: aName.match(/^[A-Z]{3,4}\s/i) ? aName.split(' ')[0].toUpperCase() : aName.substring(0,3).toUpperCase(),
                awayScore: row[7] !== "" && row[7] !== undefined ? parseInt(row[7], 10) : null,
                videoUrl: row[8] || null,
                youtubeId: ytId
            };
        });
    }

    function processStandings(rawRows) {
        _state.standings = rawRows.slice(1).filter(row => row[1]).map(row => {
            return {
                position: parseInt(row[0], 10) || 0,
                teamName: row[1],
                teamCode: row[1].substring(0,3).toUpperCase(),
                played: parseInt(row[2], 10) || 0,
                won: parseInt(row[3], 10) || 0,
                draw: parseInt(row[4], 10) || 0,
                loss: parseInt(row[5], 10) || 0,
                goalsFor: parseInt(row[6], 10) || 0,
                goalsAgainst: parseInt(row[7], 10) || 0,
                goalDifference: parseInt(row[8], 10) || 0,
                points: parseInt(row[9], 10) || 0
            };
        });
    }

    // 7. Parallel Bootstrap Initializer 
    async function bootSystemHub() {
        console.log("[HCL Engine] Initializing central pipeline parallel streams...");

        const [rawTeams, rawSchedule, rawStandings, rawRosters] = await Promise.all([
            secureFetch(ENDPOINTS.TEAMS),
            secureFetch(ENDPOINTS.SCHEDULE),
            secureFetch(ENDPOINTS.STANDINGS),
            secureFetch(ENDPOINTS.ROSTER)
        ]);

        // Sequential structural building to maintain dynamic pointer references
        processTeams(rawTeams);
        processRosters(rawRosters);
        processSchedule(rawSchedule);
        processStandings(rawStandings);

        _state.isReady = true;
        console.log("[HCL Engine] Global Core Synced. Ready for data distribution.");

        // Execute listening script blocks loaded on current viewport layout
        _state.listeners.forEach(cb => cb(window.HCL_HUB));
        _state.listeners = [];
    }

    // 8. Public Uniform Read API Interface (Exposed Globally)
    window.HCL_HUB = {
        /**
         * Fired immediately when internal records arrays are fully built.
         */
        onReady(callback) {
            if (_state.isReady) {
                callback(this);
            } else {
                _state.listeners.push(callback);
            }
        },

        /**
         * Returns team profiles matching structural inputs. 
         * Includes dynamically appended collections of their matched roster elements!
         */
        getTeams(code = null) {
            if (code) {
                const search = code.toUpperCase().trim();
                return _state.teams[search] ? { ..._state.teams[search] } : null;
            }
            return { ..._state.teams };
        },

        /**
         * Filters schedule records based on input filters.
         */
        getSchedule(filters = {}) {
            let out = [..._state.schedule];
            if (filters.week) out = out.filter(m => m.week === parseInt(filters.week, 10));
            if (filters.status) out = out.filter(m => m.status === filters.status.toUpperCase().trim());
            if (filters.teamCode) {
                const matchCode = filters.teamCode.toUpperCase().trim();
                out = out.filter(m => m.homeCode === matchCode || m.awayCode === matchCode);
            }
            return out;
        },

        /**
         * Retrieves the array list of ranked leaderboard performance items.
         */
        getStandings() {
            return [..._state.standings];
        },

        /**
         * Flexible master player query engine. Crucial for custom, secret, or data tracking viewports.
         */
        getPlayers(filters = {}) {
            let out = [..._state.players];
            if (filters.isFreeAgent === true) out = out.filter(p => p.teamCode === null);
            if (filters.isFreeAgent === false) out = out.filter(p => p.teamCode !== null);
            if (filters.position) out = out.filter(p => p.pos === filters.position.toUpperCase().trim());
            if (filters.teamCode) out = out.filter(p => p.teamCode === filters.teamCode.toUpperCase().trim());
            return out;
        }
    };

    // Auto-fire core extraction sequence on page boot runtime execution
    bootSystemHub();

})(window);
