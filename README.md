
# ♟️ ChessProEvolution

A powerful and modern web-based chess game with offline support, illegal mode, voice narration, timers, and more.

[🎮 Live Demo](https://moneythepro.github.io/ChessProEvolution/)

![screenshot](https://moneythepro.github.io/ChessProEvolution/banner.png)

---

## 🚀 Features

- 🎮 **Game Modes**
  - Player vs Player (PvP)
  - Illegal Chess Mode (any piece, any move, no check constraints)
  
- ⏱️ **Timers**
  - Configurable countdown timers (10, 20, 30 mins)
  - Time-based win via piece points

- 🗣️ **Move Narration**
  - Multi-language text-to-speech (English, Hindi, French, etc.)
  - Automatic voice selection by locale

- 🧠 **Advanced UI**
  - Chess.com-style board with coordinates
  - Piece animations and glow effects
  - Winner modals with screen shake and vibration

- 📱 **PWA Support**
  - Works offline
  - Add to Home Screen
  - Fast and responsive

- 🕹️ **3-Dot Menu**
  - Export/import game
  - Toggle move narration
  - Toggle move history (coming soon)

---

## 🛠️ Installation (Local Development)

```bash
git clone https://github.com/Moneythepro/ChessProEvolution.git
cd ChessProEvolution

Then open index.html in any browser or use a static server like:

npx serve .


---

📦 PWA Installation

You can install ChessProEvolution like an app:

1. Open https://moneythepro.github.io/ChessProEvolution/


2. Click the browser's install or "+" icon


3. Enjoy it offline like a native app!




---

📂 Project Structure

├── index.html
├── style.css
├── app.js
├── illegalChess.js
├── manifest.json
├── service-worker.js
├── /pieces         # Chess piece images
├── /assets         # Optional: logo, banner, sounds


---

💡 Future Enhancements

Online Multiplayer (Coming Soon)

AI Mode (Stockfish-based)

Save/Load games

Custom themes & piece sets



---

📄 License

This project is released under the MIT License.


---

🧠 Developed by

@Moneythepro
Made with ❤️ for fun, learning, and powerful chess experiments.
