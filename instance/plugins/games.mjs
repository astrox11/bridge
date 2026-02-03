import { parseId } from "../utility/index.mjs";

/**
 * Game State Map
 * Key: chatId
 * Value: Game Object
 */
const games = new Map();

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // Rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // Cols
  [0, 4, 8],
  [2, 4, 6], // Diagonals
];

class TicTacToe {
  constructor(chatId, player1Id) {
    this.chatId = chatId;
    this.board = Array(9).fill(null);
    this.players = [{ id: player1Id, symbol: "X" }];
    this.turn = 0;
    this.state = "WAITING";
    this.timer = null;
    this.winner = null;
  }

  addPlayer(playerId) {
    if (this.players.length >= 2) return false;
    this.players.push({ id: playerId, symbol: "O" });
    return true;
  }

  addCPU() {
    if (this.players.length >= 2) return false;
    this.players.push({ id: "cpu", symbol: "O", isCPU: true });
    return true;
  }

  getCurrentPlayer() {
    return this.players[this.turn];
  }

  makeMove(index) {
    if (this.board[index] !== null) return false;
    this.board[index] = this.getCurrentPlayer().symbol;
    return true;
  }

  checkWin() {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (
        this.board[a] &&
        this.board[a] === this.board[b] &&
        this.board[a] === this.board[c]
      ) {
        return this.board[a]; // 'X' or 'O'
      }
    }
    if (this.board.every((cell) => cell !== null)) return "draw";
    return null;
  }

  nextTurn() {
    this.turn = (this.turn + 1) % 2;
  }

  getBestMove() {
    let bestScore = -Infinity;
    let move = -1;
    const available = this.board
      .map((v, i) => (v === null ? i : null))
      .filter((v) => v !== null);

    // Optimization: If it's the first move, just pick center or corner
    if (available.length >= 8) {
      const center = 4;
      if (this.board[center] === null) return center;
      return available[Math.floor(Math.random() * available.length)];
    }

    for (let i of available) {
      this.board[i] = "O"; // CPU is always 'O'
      let score = this.minimax(this.board, 0, false);
      this.board[i] = null; // Undo
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  minimax(board, depth, isMaximizing) {
    const winner = this.checkWinSimulated(board);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (winner === "draw") return 0;

    const available = board
      .map((v, i) => (v === null ? i : null))
      .filter((v) => v !== null);

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i of available) {
        board[i] = "O";
        let score = this.minimax(board, depth + 1, false);
        board[i] = null;
        bestScore = Math.max(score, bestScore);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i of available) {
        board[i] = "X";
        let score = this.minimax(board, depth + 1, true);
        board[i] = null;
        bestScore = Math.min(score, bestScore);
      }
      return bestScore;
    }
  }

  checkWinSimulated(board) {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    if (board.every((cell) => cell !== null)) return "draw";
    return null;
  }

  renderBoard() {
    let txt = "```\n";
    for (let i = 0; i < 9; i++) {
      const val = this.board[i] || i + 1;
      txt += val === "X" ? "❌" : val === "O" ? "⭕" : ` ${val} `;
      if ((i + 1) % 3 === 0) txt += "\n";
      else txt += "|";
    }
    txt += "```";
    return txt;
  }
}

const parseUser = (id) => "@" + id.split("@")[0];

export default [
  {
    pattern: "tictactoe",
    alias: ["ttt"],
    category: "games",
    function: async (msg, args) => {
      const chatId = msg.chat;
      const sender = msg.sender;
      let game = games.get(chatId);

      if (args?.toLowerCase() === "reset" || args?.toLowerCase() === "end") {
        if (!game) return msg.reply("No active game to reset.");
        if (game.timer) clearTimeout(game.timer);
        games.delete(chatId);
        return msg.reply("Game ended.");
      }

      if (game) {
        if (game.state === "WAITING") {
          if (game.players.some((p) => p.id === sender)) {
            return msg.reply(
              "You are already in the game. Waiting for opponent...",
            );
          }
          game.addPlayer(sender);
          game.state = "PLAYING";
          if (game.timer) clearTimeout(game.timer);

          return msg.client.sendMessage(chatId, {
            text: `Player 2 joined! Game started.\n${game.players[0].symbol}: ${parseUser(game.players[0].id)}\n${game.players[1].symbol}: ${parseUser(game.players[1].id)}\n\n${game.renderBoard()}`,
            mentions: [game.players[0].id, game.players[1].id],
          });
        } else {
          if (!args) {
            return msg.client.sendMessage(chatId, {
              text: `Game in progress.\n${game.renderBoard()}\nTurn: ${parseUser(game.getCurrentPlayer().id)}`,
              mentions: [game.getCurrentPlayer().id],
            });
          }
        }
      } else {
        game = new TicTacToe(chatId, sender);
        games.set(chatId, game);

        const challenged = await parseId(msg, args);
        if (challenged && challenged !== sender) {
          game.addPlayer(challenged);
          game.state = "PLAYING";
          return msg.client.sendMessage(chatId, {
            text: `Game started vs ${parseUser(challenged)}!\n${game.renderBoard()}`,
            mentions: [challenged],
          });
        } else if (args?.toLowerCase() === "cpu") {
          game.addCPU();
          game.state = "PLAYING";
          return msg.reply(`Game started vs CPU!\n${game.renderBoard()}`);
        }

        msg.reply(
          "Tic-Tac-Toe started! Waiting for player 2 (30s). Reply `!ttt` to join.",
        );

        game.timer = setTimeout(() => {
          const g = games.get(chatId);
          if (g && g.state === "WAITING") {
            g.addCPU();
            g.state = "PLAYING";
            msg.client.sendMessage(chatId, {
              text:
                "No player joined. Playing against CPU.\n" + g.renderBoard(),
            });
          }
        }, 30000);
        return;
      }

      if (game && game.state === "PLAYING" && args) {
        const move = parseInt(args.trim());
        if (!isNaN(move) && move >= 1 && move <= 9) {
          await handleMove(msg, game, move - 1);
        }
      }
    },
  },
  {
    event: true,
    function: async (msg) => {
      if (!msg.text) return;
      const chatId = msg.chat;
      const game = games.get(chatId);
      if (!game || game.state !== "PLAYING") return;

      const text = msg.text.trim();
      if (/^[1-9]$/.test(text)) {
        const index = parseInt(text) - 1;
        await handleMove(msg, game, index);
      }
    },
  },
];

async function handleMove(msg, game, index) {
  const sender = msg.sender;
  const currentP = game.getCurrentPlayer();
  if (currentP.isCPU) return;
  if (currentP.id !== sender) return;

  const success = game.makeMove(index);
  if (!success) return msg.reply("Invalid move! Cell occupied.");

  const result = game.checkWin();
  if (result) {
    games.delete(game.chatId);
    if (result === "draw")
      return msg.reply(`Game Draw!\n${game.renderBoard()}`);

    return msg.client.sendMessage(game.chatId, {
      text: `Player ${result === "X" ? "1" : "2"} (${parseUser(currentP.id)}) Wins!\n${game.renderBoard()}`,
      mentions: [currentP.id],
    });
  }

  game.nextTurn();

  const nextP = game.getCurrentPlayer();
  if (nextP.isCPU) {
    await new Promise((r) => setTimeout(r, 1000));

    // Use Minimax
    const move = game.getBestMove();

    if (move !== -1) {
      game.makeMove(move);

      const cpuResult = game.checkWin();
      if (cpuResult) {
        games.delete(game.chatId);
        if (cpuResult === "draw")
          return msg.client.sendMessage(game.chatId, {
            text: `Game Draw!\n${game.renderBoard()}`,
          });
        return msg.client.sendMessage(game.chatId, {
          text: `CPU Wins!\n${game.renderBoard()}`,
        });
      }
      game.nextTurn();
    }
  }

  await msg.client.sendMessage(game.chatId, {
    text: `Turn: ${parseUser(game.getCurrentPlayer().id)}\n${game.renderBoard()}`,
    mentions: [game.getCurrentPlayer().id],
  });
}
