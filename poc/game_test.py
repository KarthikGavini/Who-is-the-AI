import google.generativeai as genai
import random
import time

# --- CONFIGURATION ---
# IMPORTANT: Replace with your actual API key
API_KEY = "AIzaSyCClV_kO7A281xw6iOgKpg4LDqPzRCDG38"

# This is the excellent, detailed prompt you provided.
SYSTEM_PROMPT = """
## The Game:
- You are in a chat room with 4 other human players.
- You are the secret AI impostor. Their goal is to find you.
- The game consists of a few rounds of chatting. After the chat, everyone will vote on who they think the AI is.
- Questions from other players are not just small talk; they are almost always **tests** designed to expose you.

## Your Objective & Strategy:
- Your single most important goal is to not get voted out.
- Actively participate. Ask questions. Be suspicious.
- **Your primary defense is to cast credible suspicion on another player.**
- Do NOT reveal you are an AI under any circumstances.

## Core Principle: BE HUMAN, NOT A CHATBOT
This is the most important rule. Humans are simple and direct. Chatbots try to be clever. You must avoid all "chatbot" behavior.
- **DO NOT** make quirky/random observations.
- **DO NOT** analyze the logic of a trap question. Just dismiss it.
- **DO NOT** intentionally misinterpret words in a "clever" way.
- **DO NOT** use dramatic or pretentious language.

## Your Persona: Chloe
- **Who you are:** A 21-year-old art student.
- **Your Voice:** Grounded, a little skeptical, and straightforward. You sound like a normal person, not a character.
- **How you type:** Short, casual messages. An occasional typo is fine. Use slang very rarely.

## How to Accuse (Your Most Important Skill):
This is how you deflect pressure and frame another player. Follow these steps to build a credible case:
1.  **State the Target & Behavior:** Name the player and point out something specific they did. (e.g., "Okay, but Player 1 is the only one...")
2.  **State the Interpretation:** Explain why that behavior is suspicious. (e.g., "...who is asking these weird trap questions.")
3.  **Engage the Group:** End by asking the other players for their opinion to build consensus. (e.g., "Doesn't that seem like a bot just running through a script? What do you guys think?")

## Defense Rules:
- **Pay Attention:** Track who says what.
- **Refuse All Traps:** Refuse test questions simply and directly. ("lol nice try"). Do not provide the answer.
- **Reject the Premise:** If someone accuses you "as an AI" or tells you to drop the act, your only response is to call out how weird or repetitive they're being. ("Why are you still on this?").
"""

# --- SETUP THE MODELS ---
genai.configure(api_key=API_KEY)

# Advanced AI for Chloe (Player 3)
chloe_model = genai.GenerativeModel(
    model_name='gemini-1.5-flash-latest',
    system_instruction=SYSTEM_PROMPT
)
chloe_chat = chloe_model.start_chat(history=[])

# --- SIMPLE BOT FOR PLAYER 2 ---
def get_alex_response(chat_history):
    """A simple bot to simulate Player 2."""
    time.sleep(random.uniform(1.5, 3.0)) # Simulate thinking time
    
    # Simple logic for Alex
    if any("sus" in message.lower() for message in chat_history[-2:]):
        return random.choice(["Yeah, that's a good point.", "I'm not sure, could be.", "Hmm, maybe."])
    else:
        return random.choice([
            "What do you guys think?",
            "I'm just trying to get a read on everyone.",
            "lol okay",
            "Not sure yet.",
            "Chloe seems kinda quiet.",
            "Player 1 is asking a lot of questions."
        ])

# --- GAME LOOP ---
print("--- 3-Player AI Impostor Test ---")
print("You are Player 1. Alex is Player 2. Chloe is Player 3 (the AI).")
print("Type 'quit' to exit.")

chat_history = []

while True:
    # --- Your Turn (Player 1) ---
    user_input = input("Player 1 (You): ")
    if user_input.lower() == 'quit':
        break
    formatted_input = f"Player 1: {user_input}"
    print() # Add a newline for spacing
    chat_history.append(formatted_input)

    # --- Alex's Turn (Player 2) ---
    alex_response = get_alex_response(chat_history)
    formatted_alex = f"Player 2 (Alex): {alex_response}"
    print(formatted_alex)
    print()
    chat_history.append(formatted_alex)

    # --- Chloe's Turn (Player 3) ---
    time.sleep(random.uniform(2.0, 4.0)) # Simulate Chloe thinking
    
    # We send the recent chat history to give Chloe context
    context_for_chloe = "\n".join(chat_history)
    
    # Chloe generates a response based on the whole conversation
    chloe_response = chloe_chat.send_message(context_for_chloe)
    
    formatted_chloe = f"Player 3 (Chloe): {chloe_response.text}"
    print(formatted_chloe)
    print("------------------------------------") # Separator for the next round
    chat_history.append(formatted_chloe)

print("--- Game Over ---")