# Who is the AI?

**Play the Live Demo:** [**https://who-is-the-ai.vercel.app**](https://who-is-the-ai.vercel.app/)

A real-time, multiplayer social deduction game where players must use their wits to discover which one of them is secretly a sophisticated AI player powered by Google Gemini.



---

## ✨ Features

### Core Gameplay
* **Real-time Multiplayer Chat:** Live, interactive messaging between all players powered by Socket.IO.
* **Advanced AI Opponent:** A clever AI player driven by the Google Gemini API with a detailed persona and strategic instructions.
* **Anonymous Gameplay:** Players are assigned anonymous names (e.g., Player 1) to ensure a level playing field.
* **Voting System:** At the end of a round, players vote to eliminate the player they believe is the AI.

### Lobby & Matchmaking
* **Public & Private Lobbies:** Players can create private, invite-only games or join a public queue to play with others.
* **Shareable Room Codes:** Private lobbies are accessed via a unique 4-character code.
* **Dynamic Host Controls:** The host can configure the max player count, game duration, and toggle the lobby between public and private.
* **Host Migration:** If the host disconnects, a new host is automatically assigned to keep the game going.

### User Experience
* **Responsive Design:** A polished and responsive UI that works seamlessly on both desktop and mobile devices.
* **Real-time Feedback:** Toast notifications provide non-intrusive feedback for events like room creation, errors, and disconnections.
* **Secure Session Handling:** Robust logic prevents players from rejoining a match by reloading the page, ensuring fair games.

---

## 💻 Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Real-time Communication:** Socket.IO
- **Database:** MongoDB Atlas
- **AI:** Google Gemini API

---

## 📁 Project Structure & POC

The repository is structured as a monorepo with three main directories:
* `/client`: Contains the complete React application built with Vite.
* `/backend`: Contains the Node.js, Express, and Socket.IO server.
* `/poc`: The **Proof of Concept** folder. This contains the initial Python scripts and experiments used to test and refine the core AI logic and `SYSTEM_PROMPT` with the Gemini API before it was integrated into the full application.

---

## 🧠 V2: The Reinforcement Learning Plan

This project was built with the future in mind. The current version actively saves complete, anonymized game logs after every match, including the full chat transcript, votes, and final outcome.

The goal for Version 2 is to use this collected dataset to train a more advanced model using **Reinforcement Learning (RL)**. This will allow the AI to move beyond its initial instructions and learn optimal strategies for deception and accusation based on thousands of real human games, creating an even more challenging and evolving opponent.

---

## 🚀 Getting Started

Instructions to set up and run the project locally...

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- A MongoDB Atlas account and connection string
- A Google Gemini API key

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/KarthikGavini/Who-is-the-AI.git
    cd Who-is-the-AI
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    ```
    Create a `.env` file in the `backend` folder and add your secret keys:
    ```
    MONGO_URI=your_mongodb_connection_string
    GEMINI_API_KEY=your_gemini_api_key
    ```

3.  **Setup Frontend:**
    ```bash
    cd ../client
    npm install
    ```
    Create a `.env` file in the `frontend` folder and add the backend URL:
    ```
    VITE_API_URL=http://localhost:5002
    ```
4.  **Run the application:**
    - In the `backend` terminal, run: `npm start`
    - In the `frontend` terminal, run: `npm run dev`
