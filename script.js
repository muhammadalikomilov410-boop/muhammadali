/**
 * GAME ARENA - Senior Architecture
 * Includes: SoundEngine, ChessEngine (Minimax + Alpha-Beta), CheckersEngine (Multi-jump + Minimax), and AppController
 */

// ==========================================
// 1. SYNTHESIZED WEB AUDIO SOUND ENGINE
// ==========================================
class SoundEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    play(type) {
        if (!$('#setting-sound').is(':checked')) return;
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, now);
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'capture') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
            osc.start(now);
            osc.stop(now + 0.14);
        } else if (type === 'check') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.setValueAtTime(660, now + 0.09);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        } else if (type === 'win') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const o = this.ctx.createOscillator();
                const g = this.ctx.createGain();
                o.connect(g);
                g.connect(this.ctx.destination);
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + i * 0.1);
                g.gain.setValueAtTime(0.15, now + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
                o.start(now + i * 0.1);
                o.stop(now + i * 0.1 + 0.3);
            });
        }
    }
}

const sound = new SoundEngine();

// ==========================================
// 2. COMPLETE CHESS ENGINE + MINIMAX AI
// ==========================================
class ChessEngine {
    constructor() {
        this.UNICODE = {
            wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
            bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
        };
        this.VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
        
        // Positional Heatmaps (White perspective)
        this.PST = {
            P: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5,  5, 10, 25, 25, 10,  5,  5],
                [0,  0,  0, 20, 20,  0,  0,  0],
                [5, -5,-10,  0,  0,-10, -5,  5],
                [5, 10, 10,-20,-20, 10, 10,  5],
                [0,  0,  0,  0,  0,  0,  0,  0]
            ],
            N: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            B: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            R: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [0,  0,  0,  5,  5,  0,  0,  0]
            ],
            Q: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [-5,  0,  5,  5,  5,  5,  0, -5],
                [0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            K: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20,  0,  0,  0,  0, 20, 20],
                [20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };
        this.reset();
    }

    reset() {
        this.board = [
            ['bR','bN','bB','bQ','bK','bB','bN','bR'],
            ['bP','bP','bP','bP','bP','bP','bP','bP'],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            [null,null,null,null,null,null,null,null],
            ['wP','wP','wP','wP','wP','wP','wP','wP'],
            ['wR','wN','wB','wQ','wK','wB','wN','wR']
        ];
        this.turn = 'w';
        this.castling = { wK: true, wQ: true, bK: true, bQ: true };
        this.enPassant = null;
        this.lastMove = null;
        this.history = [];
        this.captured = { w: [], b: [] };
        this.gameOver = false;
        this.result = null;
    }

    inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    cloneState() {
        return {
            board: this.board.map(row => [...row]),
            turn: this.turn,
            castling: { ...this.castling },
            enPassant: this.enPassant ? { ...this.enPassant } : null
        };
    }

    restoreState(state) {
        this.board = state.board.map(row => [...row]);
        this.turn = state.turn;
        this.castling = { ...state.castling };
        this.enPassant = state.enPassant ? { ...state.enPassant } : null;
    }

    getPseudoMoves(r, c, board = this.board, castling = this.castling, ep = this.enPassant) {
        const piece = board[r][c];
        if (!piece) return [];
        const color = piece[0];
        const type = piece[1];
        const opp = color === 'w' ? 'b' : 'w';
        const moves = [];

        const addMove = (tr, tc, special = null) => {
            moves.push({ from: { r, c }, to: { r: tr, c: tc }, piece, captured: board[tr][tc], special });
        };

        if (type === 'P') {
            const dir = color === 'w' ? -1 : 1;
            const startRow = color === 'w' ? 6 : 1;
            const promRow = color === 'w' ? 0 : 7;

            if (this.inBounds(r + dir, c) && !board[r + dir][c]) {
                addMove(r + dir, c, (r + dir === promRow) ? 'promotion' : null);
                if (r === startRow && !board[r + 2 * dir][c]) {
                    addMove(r + 2 * dir, c, 'double');
                }
            }
            for (const dc of [-1, 1]) {
                const tr = r + dir, tc = c + dc;
                if (this.inBounds(tr, tc)) {
                    if (board[tr][tc] && board[tr][tc][0] === opp) {
                        addMove(tr, tc, (tr === promRow) ? 'promotion' : null);
                    } else if (ep && ep.r === tr && ep.c === tc) {
                        moves.push({ from: { r, c }, to: { r: tr, c: tc }, piece, captured: opp + 'P', special: 'enpassant' });
                    }
                }
            }
        } else if (type === 'N') {
            const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
            for (const [dr, dc] of jumps) {
                const tr = r + dr, tc = c + dc;
                if (this.inBounds(tr, tc) && (!board[tr][tc] || board[tr][tc][0] === opp)) {
                    addMove(tr, tc);
                }
            }
        } else if (type === 'B' || type === 'R' || type === 'Q') {
            const dirs = [];
            if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
            if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
            for (const [dr, dc] of dirs) {
                let tr = r + dr, tc = c + dc;
                while (this.inBounds(tr, tc)) {
                    if (!board[tr][tc]) {
                        addMove(tr, tc);
                    } else {
                        if (board[tr][tc][0] === opp) addMove(tr, tc);
                        break;
                    }
                    tr += dr;
                    tc += dc;
                }
            }
        } else if (type === 'K') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const tr = r + dr, tc = c + dc;
                    if (this.inBounds(tr, tc) && (!board[tr][tc] || board[tr][tc][0] === opp)) {
                        addMove(tr, tc);
                    }
                }
            }
            const row = color === 'w' ? 7 : 0;
            if (r === row && c === 4) {
                if (castling[color + 'K'] && !board[row][5] && !board[row][6] && board[row][7] === color + 'R') {
                    addMove(row, 6, 'castleK');
                }
                if (castling[color + 'Q'] && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0] === color + 'R') {
                    addMove(row, 2, 'castleQ');
                }
            }
        }
        return moves;
    }

    isSquareAttacked(r, c, byColor, board = this.board) {
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const p = board[i][j];
                if (p && p[0] === byColor) {
                    if (p[1] === 'P') {
                        const dir = byColor === 'w' ? -1 : 1;
                        if (i + dir === r && (j - 1 === c || j + 1 === c)) return true;
                    } else {
                        const moves = this.getPseudoMoves(i, j, board, {wK:false,wQ:false,bK:false,bQ:false}, null);
                        if (moves.some(m => m.to.r === r && m.to.c === c)) return true;
                    }
                }
            }
        }
        return false;
    }

    findKing(color, board = this.board) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === color + 'K') return { r, c };
            }
        }
        return null;
    }

    isInCheck(color, board = this.board) {
        const king = this.findKing(color, board);
        if (!king) return false;
        const opp = color === 'w' ? 'b' : 'w';
        return this.isSquareAttacked(king.r, king.c, opp, board);
    }

    applyMoveOnBoard(move, promoType = 'Q') {
        const { from, to, piece, special } = move;
        const color = piece[0];
        const opp = color === 'w' ? 'b' : 'w';

        if (special === 'castleK' || special === 'castleQ') {
            if (this.isInCheck(color)) return false;
            const passCol = special === 'castleK' ? 5 : 3;
            if (this.isSquareAttacked(from.r, passCol, opp)) return false;
        }

        this.board[to.r][to.c] = special === 'promotion' ? (color + promoType) : piece;
        this.board[from.r][from.c] = null;

        if (special === 'enpassant') {
            this.board[from.r][to.c] = null;
        } else if (special === 'castleK') {
            this.board[from.r][5] = color + 'R';
            this.board[from.r][7] = null;
        } else if (special === 'castleQ') {
            this.board[from.r][3] = color + 'R';
            this.board[from.r][0] = null;
        }

        if (piece === 'wK') { this.castling.wK = false; this.castling.wQ = false; }
        if (piece === 'bK') { this.castling.bK = false; this.castling.bQ = false; }
        if (from.r === 7 && from.c === 0 || to.r === 7 && to.c === 0) this.castling.wQ = false;
        if (from.r === 7 && from.c === 7 || to.r === 7 && to.c === 7) this.castling.wK = false;
        if (from.r === 0 && from.c === 0 || to.r === 0 && to.c === 0) this.castling.bQ = false;
        if (from.r === 0 && from.c === 7 || to.r === 0 && to.c === 7) this.castling.bK = false;

        if (special === 'double') {
            this.enPassant = { r: (from.r + to.r) / 2, c: from.c };
        } else {
            this.enPassant = null;
        }

        this.turn = opp;
        return true;
    }

    getLegalMovesForSquare(r, c) {
        const piece = this.board[r][c];
        if (!piece || piece[0] !== this.turn) return [];
        const pseudo = this.getPseudoMoves(r, c);
        const legal = [];

        for (const move of pseudo) {
            const snapshot = this.cloneState();
            const ok = this.applyMoveOnBoard(move);
            if (ok && !this.isInCheck(piece[0])) {
                legal.push(move);
            }
            this.restoreState(snapshot);
        }
        return legal;
    }

    getAllLegalMoves(color = this.turn) {
        const all = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] && this.board[r][c][0] === color) {
                    all.push(...this.getLegalMovesForSquare(r, c));
                }
            }
        }
        return all;
    }

    makeMove(move, promoType = 'Q') {
        const notation = this.getAlgebraicNotation(move, promoType);
        const color = move.piece[0];
        if (move.captured) {
            this.captured[color].push(move.captured);
        }
        this.applyMoveOnBoard(move, promoType);
        this.lastMove = move;

        const nextMoves = this.getAllLegalMoves(this.turn);
        const inCheck = this.isInCheck(this.turn);

        let suffix = '';
        if (nextMoves.length === 0) {
            this.gameOver = true;
            if (inCheck) {
                suffix = '#';
                this.result = { winner: color, reason: 'Checkmate' };
            } else {
                this.result = { winner: 'draw', reason: 'Stalemate' };
            }
        } else if (inCheck) {
            suffix = '+';
        }

        this.history.push(notation + suffix);
        return { inCheck, gameOver: this.gameOver, result: this.result, captured: !!move.captured };
    }

    getAlgebraicNotation(move, promoType) {
        if (move.special === 'castleK') return 'O-O';
        if (move.special === 'castleQ') return 'O-O-O';
        const files = 'abcdefgh';
        const type = move.piece[1];
        const dest = files[move.to.c] + (8 - move.to.r);
        let str = type === 'P' ? (move.captured ? files[move.from.c] : '') : type;
        if (move.captured) str += 'x';
        str += dest;
        if (move.special === 'promotion') str += '=' + promoType;
        return str;
    }

    evaluateBoard() {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (!p) continue;
                const color = p[0];
                const type = p[1];
                const val = this.VALUES[type];
                const pstRow = color === 'w' ? r : 7 - r;
                const posVal = this.PST[type][pstRow][c];
                if (color === 'w') score += (val + posVal);
                else score -= (val + posVal);
            }
        }
        return score;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        const moves = this.getAllLegalMoves(this.turn);
        if (moves.length === 0) {
            if (this.isInCheck(this.turn)) {
                return isMaximizing ? -99999 - depth : 99999 + depth;
            }
            return 0;
        }
        if (depth === 0) {
            return this.evaluateBoard();
        }

        moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const m of moves) {
                const snap = this.cloneState();
                this.applyMoveOnBoard(m, 'Q');
                const ev = this.minimax(depth - 1, alpha, beta, false);
                this.restoreState(snap);
                maxEval = Math.max(maxEval, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const m of moves) {
                const snap = this.cloneState();
                this.applyMoveOnBoard(m, 'Q');
                const ev = this.minimax(depth - 1, alpha, beta, true);
                this.restoreState(snap);
                minEval = Math.min(minEval, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getBestBotMove(difficulty) {
        const moves = this.getAllLegalMoves(this.turn);
        if (moves.length === 0) return null;

        if (difficulty === 'easy') {
            return moves[Math.floor(Math.random() * moves.length)];
        }

        const depthMap = { medium: 2, hard: 3, expert: 4 };
        const depth = depthMap[difficulty] || 2;
        const isMaximizing = this.turn === 'w';

        let bestMove = moves[0];
        let bestVal = isMaximizing ? -Infinity : Infinity;

        moves.sort(() => Math.random() - 0.5);
        moves.sort((a, b) => (b.captured ? 10 : 0) - (a.captured ? 10 : 0));

        for (const m of moves) {
            const snap = this.cloneState();
            this.applyMoveOnBoard(m, 'Q');
            const val = this.minimax(depth - 1, -Infinity, Infinity, !isMaximizing);
            this.restoreState(snap);

            if (isMaximizing && val > bestVal) {
                bestVal = val;
                bestMove = m;
            } else if (!isMaximizing && val < bestVal) {
                bestVal = val;
                bestMove = m;
            }
        }
        return bestMove;
    }
}

// ==========================================
// 3. COMPLETE CHECKERS ENGINE + MINIMAX AI
// ==========================================
class CheckersEngine {
    constructor() {
        this.reset();
    }

    reset() {
        this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    if (r < 3) this.board[r][c] = 'b';
                    else if (r > 4) this.board[r][c] = 'r';
                }
            }
        }
        this.turn = 'r';
        this.mustContinueFrom = null;
        this.lastMove = null;
        this.history = [];
        this.captured = { r: [], b: [] };
        this.gameOver = false;
        this.result = null;
    }

    inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    getPieceMoves(r, c, board = this.board) {
        const piece = board[r][c];
        if (!piece) return { captures: [], steps: [] };
        const color = piece[0];
        const isKing = piece.length === 2;
        const opp = color === 'r' ? 'b' : 'r';

        const dirs = [];
        if (color === 'r' || isKing) dirs.push([-1, -1], [-1, 1]);
        if (color === 'b' || isKing) dirs.push([1, -1], [1, 1]);

        const captures = [];
        const steps = [];

        for (const [dr, dc] of dirs) {
            const mr = r + dr, mc = c + dc;
            const jr = r + 2 * dr, jc = c + 2 * dc;

            if (this.inBounds(jr, jc) && board[mr][mc] && board[mr][mc][0] === opp && !board[jr][jc]) {
                captures.push({
                    from: { r, c },
                    to: { r: jr, c: jc },
                    jumped: { r: mr, c: mc, piece: board[mr][mc] },
                    isCapture: true
                });
            } else if (this.inBounds(mr, mc) && !board[mr][mc]) {
                steps.push({
                    from: { r, c },
                    to: { r: mr, c: mc },
                    isCapture: false
                });
            }
        }
        return { captures, steps };
    }

    getAllLegalMoves(color = this.turn, board = this.board, lockPos = this.mustContinueFrom) {
        if (lockPos) {
            return this.getPieceMoves(lockPos.r, lockPos.c, board).captures;
        }

        let allCaptures = [];
        let allSteps = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] && board[r][c][0] === color) {
                    const { captures, steps } = this.getPieceMoves(r, c, board);
                    allCaptures.push(...captures);
                    allSteps.push(...steps);
                }
            }
        }
        return allCaptures.length > 0 ? allCaptures : allSteps;
    }

    getLegalMovesForSquare(r, c) {
        const all = this.getAllLegalMoves(this.turn);
        return all.filter(m => m.from.r === r && m.from.c === c);
    }

    makeMove(move) {
        const piece = this.board[move.from.r][move.from.c];
        const color = piece[0];
        const opp = color === 'r' ? 'b' : 'r';

        this.board[move.to.r][move.to.c] = piece;
        this.board[move.from.r][move.from.c] = null;

        let promoted = false;
        if (color === 'r' && move.to.r === 0 && piece === 'r') {
            this.board[move.to.r][move.to.c] = 'rK';
            promoted = true;
        } else if (color === 'b' && move.to.r === 7 && piece === 'b') {
            this.board[move.to.r][move.to.c] = 'bK';
            promoted = true;
        }

        if (move.isCapture) {
            this.board[move.jumped.r][move.jumped.c] = null;
            this.captured[color].push(move.jumped.piece);
        }

        const files = 'abcdefgh';
        const notation = `${files[move.from.c]}${8 - move.from.r}${move.isCapture ? 'x' : '-'}${files[move.to.c]}${8 - move.to.r}${promoted ? '👑' : ''}`;
        this.history.push(notation);
        this.lastMove = move;

        if (move.isCapture && !promoted) {
            const moreJumps = this.getPieceMoves(move.to.r, move.to.c).captures;
            if (moreJumps.length > 0) {
                this.mustContinueFrom = { r: move.to.r, c: move.to.c };
                return { multiJump: true, captured: true, gameOver: false };
            }
        }

        this.mustContinueFrom = null;
        this.turn = opp;

        const oppMoves = this.getAllLegalMoves(this.turn);
        if (oppMoves.length === 0) {
            this.gameOver = true;
            this.result = { winner: color, reason: 'No legal moves remaining' };
        }

        return { multiJump: false, captured: move.isCapture, gameOver: this.gameOver, result: this.result };
    }

    evaluateBoard(board) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (!p) continue;
                const isKing = p.length === 2;
                const val = isKing ? 180 : 100;
                const advanceBonus = p[0] === 'r' ? (7 - r) * 5 : r * 5;
                const centerBonus = (c >= 2 && c <= 5) ? 10 : 0;

                if (p[0] === 'r') score += (val + advanceBonus + centerBonus);
                else score -= (val + advanceBonus + centerBonus);
            }
        }
        return score;
    }

    simulateBoardMove(board, move) {
        const copy = board.map(row => [...row]);
        const piece = copy[move.from.r][move.from.c];
        copy[move.to.r][move.to.c] = piece;
        copy[move.from.r][move.from.c] = null;
        if (move.isCapture) copy[move.jumped.r][move.jumped.c] = null;
        if (piece === 'r' && move.to.r === 0) copy[move.to.r][move.to.c] = 'rK';
        if (piece === 'b' && move.to.r === 7) copy[move.to.r][move.to.c] = 'bK';
        return copy;
    }

    minimax(board, depth, alpha, beta, turnColor) {
        const moves = this.getAllLegalMoves(turnColor, board, null);
        if (moves.length === 0) {
            return turnColor === 'r' ? -10000 - depth : 10000 + depth;
        }
        if (depth === 0) return this.evaluateBoard(board);

        const isMax = turnColor === 'r';
        const nextTurn = turnColor === 'r' ? 'b' : 'r';

        if (isMax) {
            let maxEv = -Infinity;
            for (const m of moves) {
                const nextB = this.simulateBoardMove(board, m);
                const ev = this.minimax(nextB, depth - 1, alpha, beta, nextTurn);
                maxEv = Math.max(maxEv, ev);
                alpha = Math.max(alpha, ev);
                if (beta <= alpha) break;
            }
            return maxEv;
        } else {
            let minEv = Infinity;
            for (const m of moves) {
                const nextB = this.simulateBoardMove(board, m);
                const ev = this.minimax(nextB, depth - 1, alpha, beta, nextTurn);
                minEv = Math.min(minEv, ev);
                beta = Math.min(beta, ev);
                if (beta <= alpha) break;
            }
            return minEv;
        }
    }

    getBestBotMove(difficulty) {
        const moves = this.getAllLegalMoves(this.turn);
        if (moves.length === 0) return null;
        if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];

        const depthMap = { medium: 2, hard: 4, expert: 6 };
        const depth = depthMap[difficulty] || 2;
        const isMax = this.turn === 'r';
        const nextTurn = isMax ? 'b' : 'r';

        let bestMove = moves[0];
        let bestVal = isMax ? -Infinity : Infinity;

        moves.sort(() => Math.random() - 0.5);

        for (const m of moves) {
            const nextB = this.simulateBoardMove(this.board, m);
            const val = this.minimax(nextB, depth - 1, -Infinity, Infinity, nextTurn);
            if (isMax && val > bestVal) {
                bestVal = val;
                bestMove = m;
            } else if (!isMax && val < bestVal) {
                bestVal = val;
                bestMove = m;
            }
        }
        return bestMove;
    }
}

// ==========================================
// 4. MAIN APPLICATION CONTROLLER
// ==========================================
class GameArenaApp {
    constructor() {
        this.currentGame = 'chess';
        this.mode = 'bot';
        this.difficulty = 'medium';
        this.engine = null;
        this.selectedCell = null;
        this.legalMoves = [];
        this.scores = { p1: 0, p2: 0 };
        this.timers = { p1: 600, p2: 600 };
        this.timerInterval = null;
        this.botThinking = false;
        this.pendingPromotionMove = null;

        this.setupModal = new bootstrap.Modal(document.getElementById('setupModal'));
        this.promoModal = new bootstrap.Modal(document.getElementById('promotionModal'));
        this.gameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));

        this.bindEvents();
        this.checkSavedGame();
    }

    bindEvents() {
        $('#mobile-menu-btn').on('click', () => $('#mobile-menu').toggleClass('hidden'));

        $('.mode-option-btn').on('click', (e) => {
            $('.mode-option-btn').removeClass('active');
            const btn = $(e.currentTarget);
            btn.addClass('active');
            this.mode = btn.data('mode');
            if (this.mode === 'bot') {
                $('#difficulty-selector-group').slideDown(200);
            } else {
                $('#difficulty-selector-group').slideUp(200);
            }
        });

        const diffDescriptions = {
            easy: 'Easy: Relaxed casual opponent making valid tactical moves.',
            medium: 'Medium: Minimax search depth 2 with positional board evaluation.',
            hard: 'Hard: Alpha-Beta pruning depth 3-4 with aggressive tactical lookahead.',
            expert: 'Expert: Deep Minimax search (4-6 ply) with full positional heuristics.'
        };

        $('.diff-option-btn').on('click', (e) => {
            $('.diff-option-btn').removeClass('active');
            const btn = $(e.currentTarget);
            btn.addClass('active');
            this.difficulty = btn.data('diff');
            $('#diff-desc').text(diffDescriptions[this.difficulty]);
        });
    }

    navigate(page) {
        $('.page-section').addClass('hidden').removeClass('active');
        $(`#page-${page}`).removeClass('hidden').addClass('active');
        $('.nav-btn').removeClass('active');
        $(`.nav-btn[data-page="${page}"]`).addClass('active');
        $('#mobile-menu').addClass('hidden');

        if (page === 'stats') {
            this.renderStatsPage();
        }
        if (page !== 'arena') {
            this.stopTimer();
        }
    }

    openSetupModal(gameType) {
        this.currentGame = gameType;
        const title = gameType === 'chess' ? '♟ Setup Chess Match' : '⚫ Setup Checkers Match';
        $('#setupModalTitle').text(title);
        this.setupModal.show();
    }

    startNewGame() {
        this.setupModal.hide();
        this.scores = { p1: 0, p2: 0 };
        this.initMatch();
    }

    restartCurrentGame() {
        this.initMatch();
    }

    initMatch() {
        this.stopTimer();
        this.selectedCell = null;
        this.legalMoves = [];
        this.botThinking = false;
        $('#bot-thinking').addClass('hidden');

        const baseTime = parseInt($('#setting-timer').val()) || 600;
        this.timers = { p1: baseTime, p2: baseTime };

        if (this.currentGame === 'chess') {
            this.engine = new ChessEngine();
            $('#arena-title').html('♟ CHESS ARENA');
            $('#game-board').removeClass('checkers-board');
        } else {
            this.engine = new CheckersEngine();
            $('#arena-title').html('⚫ CHECKERS ARENA');
            $('#game-board').addClass('checkers-board');
        }

        const modeLabel = this.mode === 'bot' ? `Human vs Bot • ${this.difficulty.toUpperCase()}` : 'Human vs Human (Local)';
        $('#arena-subtitle').text(modeLabel);

        $('#p1-name').text(this.mode === 'bot' ? 'Player 1 (You)' : 'Player 1 (White/Red)');
        $('#p2-name').text(this.mode === 'bot' ? 'AI Engine' : 'Player 2 (Black)');
        $('#p2-avatar').text(this.mode === 'bot' ? '🤖' : '👤');
        $('#p2-badge').text(this.mode === 'bot' ? this.difficulty : '2P LOCAL');
        $('#p1-score').text(this.scores.p1);
        $('#p2-score').text(this.scores.p2);

        this.navigate('arena');
        this.renderBoard();
        this.updateSidebarUI();
        this.startTimer();
        this.saveGameState();
    }

    renderBoard() {
        const $board = $('#game-board');
        $board.empty();
        const files = ['a','b','c','d','e','f','g','h'];
        const showHints = $('#setting-hints').is(':checked');

        let kingInCheckPos = null;
        if (this.currentGame === 'chess' && this.engine.isInCheck(this.engine.turn)) {
            kingInCheckPos = this.engine.findKing(this.engine.turn);
        }

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isLight = (r + c) % 2 === 0;
                const cell = $('<div>')
                    .addClass(`board-cell ${isLight ? 'cell-light' : 'cell-dark'}`)
                    .attr('data-r', r)
                    .attr('data-c', c);

                if (c === 0) cell.append(`<span class="coord-rank">${8 - r}</span>`);
                if (r === 7) cell.append(`<span class="coord-file">${files[c]}</span>`);

                if (this.selectedCell && this.selectedCell.r === r && this.selectedCell.c === c) {
                    cell.addClass('cell-selected');
                }

                if (this.engine.lastMove) {
                    const lm = this.engine.lastMove;
                    if ((lm.from.r === r && lm.from.c === c) || (lm.to.r === r && lm.to.c === c)) {
                        cell.addClass('cell-last-move');
                    }
                }

                if (kingInCheckPos && kingInCheckPos.r === r && kingInCheckPos.c === c) {
                    cell.addClass('cell-check');
                }

                if (showHints) {
                    const targetMove = this.legalMoves.find(m => m.to.r === r && m.to.c === c);
                    if (targetMove) {
                        const isCap = this.currentGame === 'chess' ? !!targetMove.captured : targetMove.isCapture;
                        cell.addClass(isCap ? 'legal-capture' : 'legal-dot');
                    }
                }

                const piece = this.engine.board[r][c];
                if (piece) {
                    if (this.currentGame === 'chess') {
                        const colorClass = piece[0] === 'w' ? 'piece-white' : 'piece-black';
                        cell.append(`<span class="chess-piece ${colorClass}">${this.engine.UNICODE[piece]}</span>`);
                    } else {
                        const colorClass = piece[0] === 'r' ? 'checker-red' : 'checker-black';
                        const crown = piece.length === 2 ? '👑' : '';
                        cell.append(`<div class="checker-piece ${colorClass}">${crown}</div>`);
                    }
                }

                cell.on('click', () => this.handleCellClick(r, c));
                $board.append(cell);
            }
        }
    }

    handleCellClick(r, c) {
        if (this.engine.gameOver || this.botThinking) return;

        const p2Turn = 'b';
        if (this.mode === 'bot' && this.engine.turn === p2Turn) return;

        const chosenMove = this.legalMoves.find(m => m.to.r === r && m.to.c === c);
        if (chosenMove) {
            if (this.currentGame === 'chess' && chosenMove.special === 'promotion') {
                this.promptPawnPromotion(chosenMove);
                return;
            }
            this.executeMove(chosenMove);
            return;
        }

        const clickedPiece = this.engine.board[r][c];
        if (clickedPiece && clickedPiece[0] === this.engine.turn) {
            this.selectedCell = { r, c };
            this.legalMoves = this.engine.getLegalMovesForSquare(r, c);
            this.renderBoard();
        } else {
            if (this.currentGame === 'checkers' && this.engine.mustContinueFrom) return;
            this.selectedCell = null;
            this.legalMoves = [];
            this.renderBoard();
        }
    }

    promptPawnPromotion(move) {
        this.pendingPromotionMove = move;
        const color = move.piece[0];
        const choices = ['Q', 'R', 'B', 'N'];
        const $container = $('#promotion-choices').empty();

        choices.forEach(type => {
            const symbol = this.engine.UNICODE[color + type];
            const btn = $(`<button class="p-3 rounded-xl bg-white/10 hover:bg-accent text-3xl transition">${symbol}</button>`);
            btn.on('click', () => {
                this.promoModal.hide();
                this.executeMove(this.pendingPromotionMove, type);
                this.pendingPromotionMove = null;
            });
            $container.append(btn);
        });
        this.promoModal.show();
    }

    executeMove(move, promoType = 'Q') {
        const outcome = this.engine.makeMove(move, promoType);

        if (outcome.inCheck) sound.play('check');
        else if (outcome.captured) sound.play('capture');
        else sound.play('move');

        if (this.currentGame === 'checkers' && outcome.multiJump) {
            this.selectedCell = { r: move.to.r, c: move.to.c };
            this.legalMoves = this.engine.getLegalMovesForSquare(move.to.r, move.to.c);
            this.renderBoard();
            this.updateSidebarUI();
            return;
        }

        this.selectedCell = null;
        this.legalMoves = [];
        this.renderBoard();
        this.updateSidebarUI();
        this.saveGameState();

        if (outcome.gameOver) {
            this.handleGameOver(outcome.result);
            return;
        }

        if (this.mode === 'bot' && this.engine.turn === 'b') {
            this.triggerBotTurn();
        }
    }

    triggerBotTurn() {
        this.botThinking = true;
        $('#bot-thinking').removeClass('hidden');

        setTimeout(() => {
            const bestMove = this.engine.getBestBotMove(this.difficulty);
            this.botThinking = false;
            $('#bot-thinking').addClass('hidden');

            if (bestMove) {
                this.executeMove(bestMove, 'Q');
            }
        }, 450);
    }

    updateSidebarUI() {
        const isP1Turn = (this.currentGame === 'chess' && this.engine.turn === 'w') ||
                         (this.currentGame === 'checkers' && this.engine.turn === 'r');

        if (isP1Turn) {
            $('#card-player-1').addClass('active-turn');
            $('#card-player-2').removeClass('active-turn');
            $('#game-status-text').text(this.currentGame === 'chess' ? "White's Turn" : "Red's Turn");
        } else {
            $('#card-player-2').addClass('active-turn');
            $('#card-player-1').removeClass('active-turn');
            $('#game-status-text').text(this.mode === 'bot' ? "Bot's Turn" : "Black's Turn");
        }

        if (this.currentGame === 'chess' && this.engine.isInCheck(this.engine.turn)) {
            $('#game-status-text').text('CHECK! Defend your King');
        }
        if (this.currentGame === 'checkers' && this.engine.mustContinueFrom) {
            $('#game-status-text').text('MULTI-JUMP! Continue capturing');
        }

        const p1Key = this.currentGame === 'chess' ? 'w' : 'r';
        const p2Key = 'b';

        if (this.currentGame === 'chess') {
            $('#p1-captured').html(this.engine.captured[p1Key].map(p => `<span>${this.engine.UNICODE[p]}</span>`).join(''));
            $('#p2-captured').html(this.engine.captured[p2Key].map(p => `<span>${this.engine.UNICODE[p]}</span>`).join(''));
        } else {
            $('#p1-captured').html(this.engine.captured[p1Key].map(() => `<span class="text-slate-400">⚫</span>`).join(''));
            $('#p2-captured').html(this.engine.captured[p2Key].map(() => `<span class="text-rose-500">🔴</span>`).join(''));
        }

        const $hist = $('#move-history-list');
        const moves = this.engine.history;
        $('#move-count-badge').text(`${moves.length} moves`);

        if (moves.length === 0) {
            $hist.html('<div class="text-textSec text-center italic text-xs mt-10">Make your first move to begin...</div>');
        } else {
            let html = '';
            for (let i = 0; i < moves.length; i += 2) {
                const turnNum = Math.floor(i / 2) + 1;
                const m1 = moves[i] || '';
                const m2 = moves[i + 1] || '';
                html += `
                    <div class="flex items-center px-2 py-1 rounded hover:bg-white/5">
                        <span class="w-10 text-textSec">${turnNum}.</span>
                        <span class="w-24 text-white font-semibold">${m1}</span>
                        <span class="w-24 text-accent">${m2}</span>
                    </div>
                `;
            }
            $hist.html(html);
            $hist.scrollTop($hist[0].scrollHeight);
        }
    }

    handleGameOver(result) {
        this.stopTimer();
        localStorage.removeItem('game_arena_saved');
        this.checkSavedGame();
        sound.play('win');

        const p1Color = this.currentGame === 'chess' ? 'w' : 'r';
        let title = 'GAME OVER';
        let subtitle = '';
        let icon = '🏆';

        if (result.winner === 'draw') {
            title = 'DRAW MATCH';
            subtitle = `Match ended in a draw (${result.reason}).`;
            icon = '🤝';
            this.recordStat('draw');
        } else if (result.winner === p1Color) {
            this.scores.p1++;
            $('#p1-score').text(this.scores.p1);
            title = 'VICTORY!';
            subtitle = `Player 1 wins by ${result.reason}!`;
            icon = '🏆';
            this.recordStat('win');
        } else {
            this.scores.p2++;
            $('#p2-score').text(this.scores.p2);
            title = this.mode === 'bot' ? 'DEFEAT' : 'PLAYER 2 WINS!';
            subtitle = `${this.mode === 'bot' ? 'AI Bot' : 'Player 2'} wins by ${result.reason}.`;
            icon = this.mode === 'bot' ? '🤖' : '🏆';
            this.recordStat('loss');
        }

        $('#gameover-icon').text(icon);
        $('#gameover-title').text(title);
        $('#gameover-subtitle').text(subtitle);
        $('#game-status-text').text(title);

        setTimeout(() => this.gameOverModal.show(), 400);
    }

    startTimer() {
        this.stopTimer();
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            if (this.engine.gameOver) {
                this.stopTimer();
                return;
            }
            const isP1 = (this.currentGame === 'chess' && this.engine.turn === 'w') ||
                         (this.currentGame === 'checkers' && this.engine.turn === 'r');

            if (isP1) {
                this.timers.p1--;
                if (this.timers.p1 <= 0) {
                    this.timers.p1 = 0;
                    this.engine.gameOver = true;
                    this.handleGameOver({ winner: 'b', reason: 'Time Out' });
                }
            } else {
                this.timers.p2--;
                if (this.timers.p2 <= 0) {
                    this.timers.p2 = 0;
                    this.engine.gameOver = true;
                    const p1Color = this.currentGame === 'chess' ? 'w' : 'r';
                    this.handleGameOver({ winner: p1Color, reason: 'Time Out' });
                }
            }
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const format = (sec) => {
            const m = Math.floor(sec / 60).toString().padStart(2, '0');
            const s = (sec % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        };
        $('#p1-timer').text(format(this.timers.p1));
        $('#p2-timer').text(format(this.timers.p2));
    }

    saveGameState() {
        if (!this.engine || this.engine.gameOver) return;
        const payload = {
            currentGame: this.currentGame,
            mode: this.mode,
            difficulty: this.difficulty,
            board: this.engine.board,
            turn: this.engine.turn,
            history: this.engine.history,
            captured: this.engine.captured,
            timers: this.timers
        };
        localStorage.setItem('game_arena_saved', JSON.stringify(payload));
        this.checkSavedGame();
    }

    checkSavedGame() {
        const raw = localStorage.getItem('game_arena_saved');
        if (raw) {
            const data = JSON.parse(raw);
            $('#continue-banner').removeClass('hidden');
            $('#continue-text').text(`Continue Saved ${data.currentGame.toUpperCase()} Match (${data.history.length} moves)`);
        } else {
            $('#continue-banner').addClass('hidden');
        }
    }

    continueSavedGame() {
        const raw = localStorage.getItem('game_arena_saved');
        if (!raw) return;
        const data = JSON.parse(raw);
        this.currentGame = data.currentGame;
        this.mode = data.mode;
        this.difficulty = data.difficulty;

        this.initMatch();
        this.engine.board = data.board;
        this.engine.turn = data.turn;
        this.engine.history = data.history;
        this.engine.captured = data.captured;
        this.timers = data.timers;

        this.renderBoard();
        this.updateSidebarUI();
        this.updateTimerDisplay();
    }

    getStats() {
        const def = { wins: 4, losses: 2, draws: 1, chessPlayed: 4, checkersPlayed: 3 };
        const raw = localStorage.getItem('game_arena_stats');
        return raw ? JSON.parse(raw) : def;
    }

    recordStat(type) {
        const stats = this.getStats();
        if (type === 'win') stats.wins++;
        if (type === 'loss') stats.losses++;
        if (type === 'draw') stats.draws++;
        if (this.currentGame === 'chess') stats.chessPlayed++;
        else stats.checkersPlayed++;
        localStorage.setItem('game_arena_stats', JSON.stringify(stats));
    }

    resetStats() {
        localStorage.setItem('game_arena_stats', JSON.stringify({
            wins: 0, losses: 0, draws: 0, chessPlayed: 0, checkersPlayed: 0
        }));
        this.renderStatsPage();
    }

    renderStatsPage() {
        const s = this.getStats();
        const total = s.wins + s.losses + s.draws;
        const winRate = total > 0 ? Math.round((s.wins / total) * 100) : 0;

        $('#stat-total').text(total);
        $('#stat-wins').text(s.wins);
        $('#stat-losses').text(s.losses);
        $('#stat-winrate').text(`${winRate}%`);

        $('#morris-donut-chart').empty();
        $('#morris-bar-chart').empty();

        Morris.Donut({
            element: 'morris-donut-chart',
            data: [
                { label: 'Victories', value: s.wins || 1 },
                { label: 'Defeats', value: s.losses },
                { label: 'Draws', value: s.draws }
            ],
            colors: ['#22c55e', '#ef4444', '#6366f1'],
            labelColor: '#f8fafc',
            backgroundColor: '#151b28',
            resize: true
        });

        Morris.Bar({
            element: 'morris-bar-chart',
            data: [
                { game: 'Chess', matches: s.chessPlayed },
                { game: 'Checkers', matches: s.checkersPlayed }
            ],
            xkey: 'game',
            ykeys: ['matches'],
            labels: ['Matches Played'],
            barColors: ['#8b5cf6'],
            gridTextColor: '#94a3b8',
            hideHover: 'auto',
            resize: true
        });
    }
}

let app;
$(document).ready(() => {
    app = new GameArenaApp();
});
