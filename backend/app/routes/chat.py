from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from datetime import datetime
from bson import ObjectId
import openai
from ..database import get_database
from ..config import settings
from ..models import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    MessageRole,
    ConversationResponse,
    ConversationListResponse,
    UserResponse,
    TransactionStatus
)
from ..auth import get_current_user

router = APIRouter(prefix="/chat", tags=["AI Chat"])


async def get_inventory_context(db) -> str:
    """Get current inventory context for AI."""
    # Get component summary
    components = await db.components.find().to_list(length=100)
    
    component_info = []
    for c in components:
        component_info.append(
            f"- {c['name']}: {c['available_quantity']}/{c['total_quantity']} available "
            f"(Category: {c['category']}, Location: {c.get('location', 'N/A')})"
        )
    
    return "\n".join(component_info) if component_info else "No components in inventory."


async def get_active_transactions_context(db) -> str:
    """Get active transactions context for AI."""
    active_statuses = [
        TransactionStatus.PENDING.value,
        TransactionStatus.ISSUED.value,
        TransactionStatus.OVERDUE.value
    ]
    
    transactions = await db.transactions.find({
        "status": {"$in": active_statuses}
    }).sort("created_at", -1).to_list(length=50)
    
    if not transactions:
        return "No active transactions."
    
    tx_info = []
    for t in transactions:
        due_info = ""
        if t.get("due_date"):
            due_date = t["due_date"]
            if due_date < datetime.utcnow():
                due_info = f" [OVERDUE since {due_date.strftime('%Y-%m-%d')}]"
            else:
                due_info = f" [Due: {due_date.strftime('%Y-%m-%d')}]"
        
        tx_info.append(
            f"- {t['component_name']} x{t['quantity']} → {t['user_name']} ({t['user_email']}) "
            f"[Status: {t['status']}]{due_info}"
        )
    
    return "\n".join(tx_info)


async def get_overdue_context(db) -> str:
    """Get overdue components context."""
    overdue = await db.transactions.find({
        "status": {"$in": [TransactionStatus.ISSUED.value, TransactionStatus.OVERDUE.value]},
        "due_date": {"$lt": datetime.utcnow()}
    }).to_list(length=50)
    
    if not overdue:
        return "No overdue components."
    
    info = []
    for t in overdue:
        days_overdue = (datetime.utcnow() - t["due_date"]).days
        info.append(
            f"- {t['component_name']} x{t['quantity']} by {t['user_name']} "
            f"({t['user_email']}) - {days_overdue} days overdue"
        )
    
    return "\n".join(info)


def build_system_prompt(inventory: str, transactions: str, overdue: str) -> str:
    """Build the system prompt with current context."""
    return f"""You are LogGPT, an AI assistant for managing a Hardware & IoT Components room. 
You help users track inventory, find components, and manage issues/returns.

CURRENT INVENTORY:
{inventory}

ACTIVE TRANSACTIONS (Pending/Issued/Overdue):
{transactions}

OVERDUE COMPONENTS:
{overdue}

CAPABILITIES:
- Answer questions about component availability
- Tell who has which components
- List overdue items
- Provide component specifications
- Help with inventory queries

RESPONSE STYLE:
- Be concise and helpful
- Use bullet points for lists
- Highlight important information (overdue items, low stock)
- If you don't have information, say so clearly

Always base your answers on the provided context. Do not make up information."""


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Send a message to LogGPT and get a response."""
    db = get_database()
    
    # Get or create conversation
    conversation_id = request.conversation_id
    conversation = None
    
    if conversation_id and ObjectId.is_valid(conversation_id):
        conversation = await db.chat_history.find_one({
            "_id": ObjectId(conversation_id),
            "user_id": current_user.id
        })
    
    if not conversation:
        # Create new conversation
        conversation = {
            "user_id": current_user.id,
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.chat_history.insert_one(conversation)
        conversation_id = str(result.inserted_id)
    else:
        conversation_id = str(conversation["_id"])
    
    # Get context for AI
    inventory = await get_inventory_context(db)
    transactions = await get_active_transactions_context(db)
    overdue = await get_overdue_context(db)
    
    # Build messages for OpenAI
    system_prompt = build_system_prompt(inventory, transactions, overdue)
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (last 10 messages)
    if conversation.get("messages"):
        for msg in conversation["messages"][-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    # Add current user message
    messages.append({"role": "user", "content": request.message})
    
    # Call OpenAI API
    try:
        if settings.openai_api_key:
            client = openai.OpenAI(api_key=settings.openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            assistant_message = response.choices[0].message.content
        else:
            # Fallback response when OpenAI is not configured
            assistant_message = generate_fallback_response(request.message, inventory, transactions, overdue)
    except Exception as e:
        assistant_message = f"I apologize, but I'm having trouble processing your request. Error: {str(e)}"
    
    # Save messages to conversation
    now = datetime.utcnow()
    new_messages = [
        {"role": MessageRole.USER.value, "content": request.message, "timestamp": now},
        {"role": MessageRole.ASSISTANT.value, "content": assistant_message, "timestamp": now}
    ]
    
    await db.chat_history.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$push": {"messages": {"$each": new_messages}},
            "$set": {"updated_at": now}
        }
    )
    
    # Generate suggestions
    suggestions = generate_suggestions(request.message)
    
    return ChatResponse(
        message=assistant_message,
        conversation_id=conversation_id,
        suggestions=suggestions
    )


def generate_fallback_response(query: str, inventory: str, transactions: str, overdue: str) -> str:
    """Generate a smart response without OpenAI API."""
    query_lower = query.lower()
    
    # Parse inventory into searchable format
    inventory_items = []
    for line in inventory.split('\n'):
        if line.strip().startswith('-'):
            inventory_items.append(line.strip())
    
    # Parse transactions into searchable format
    transaction_items = []
    for line in transactions.split('\n'):
        if line.strip().startswith('-'):
            transaction_items.append(line.strip())
    
    # Parse overdue into searchable format
    overdue_items = []
    for line in overdue.split('\n'):
        if line.strip().startswith('-'):
            overdue_items.append(line.strip())
    
    # Search for specific component by name
    search_terms = []
    common_components = ['esp32', 'arduino', 'raspberry', 'sensor', 'led', 'resistor', 
                         'capacitor', 'motor', 'servo', 'display', 'oled', 'lcd', 
                         'relay', 'transistor', 'diode', 'wire', 'breadboard', 'jumper']
    
    for term in common_components:
        if term in query_lower:
            search_terms.append(term)
    
    # Also extract any quoted terms or capitalized words
    words = query.split()
    for word in words:
        clean_word = word.strip('?.,!').lower()
        if len(clean_word) > 2 and clean_word not in ['the', 'what', 'where', 'which', 'who', 'has', 'have', 'are', 'is', 'can', 'how', 'many', 'much']:
            if clean_word not in search_terms:
                search_terms.append(clean_word)
    
    # Find matching inventory items
    matching_inventory = []
    for item in inventory_items:
        for term in search_terms:
            if term in item.lower():
                matching_inventory.append(item)
                break
    
    # Find matching transactions
    matching_transactions = []
    for item in transaction_items:
        for term in search_terms:
            if term in item.lower():
                matching_transactions.append(item)
                break
    
    # Find matching overdue
    matching_overdue = []
    for item in overdue_items:
        for term in search_terms:
            if term in item.lower():
                matching_overdue.append(item)
                break
    
    # Handle "where is" queries
    if "where" in query_lower or "location" in query_lower or "find" in query_lower:
        if matching_inventory:
            response = "📍 **Component Location(s):**\n\n"
            for item in matching_inventory:
                response += f"{item}\n"
            if matching_transactions:
                response += "\n📋 **Currently Issued To:**\n\n"
                for item in matching_transactions:
                    response += f"{item}\n"
            return response
        elif matching_transactions:
            response = "📋 **This component is currently issued:**\n\n"
            for item in matching_transactions:
                response += f"{item}\n"
            return response
        else:
            return f"I couldn't find specific location information for that component. Here's the full inventory:\n\n{inventory}"
    
    # Handle "who has" queries  
    if "who" in query_lower and ("has" in query_lower or "took" in query_lower or "borrowed" in query_lower):
        if matching_transactions:
            response = "👤 **Currently Issued To:**\n\n"
            for item in matching_transactions:
                response += f"{item}\n"
            return response
        elif search_terms:
            return f"No one currently has {', '.join(search_terms)} checked out. The component should be available in inventory."
        else:
            return f"📋 **All Active Transactions:**\n\n{transactions}"
    
    # Handle availability queries
    if "available" in query_lower or "stock" in query_lower or "have" in query_lower or "inventory" in query_lower:
        if matching_inventory:
            response = "📦 **Availability:**\n\n"
            for item in matching_inventory:
                response += f"{item}\n"
            return response
        else:
            return f"📦 **Full Inventory:**\n\n{inventory}"
    
    # Handle overdue queries
    if "overdue" in query_lower or "late" in query_lower or "due" in query_lower:
        if matching_overdue:
            response = "⚠️ **Overdue Items:**\n\n"
            for item in matching_overdue:
                response += f"{item}\n"
            return response
        elif overdue_items:
            return f"⚠️ **All Overdue Items:**\n\n{overdue}"
        else:
            return "✅ Great news! There are no overdue items at the moment."
    
    # Handle count/how many queries
    if "how many" in query_lower or "count" in query_lower or "total" in query_lower:
        if matching_inventory:
            response = "📊 **Count Information:**\n\n"
            for item in matching_inventory:
                response += f"{item}\n"
            return response
    
    # If we found matching items for a general query, show them
    if matching_inventory or matching_transactions:
        response = ""
        if matching_inventory:
            response += "📦 **In Inventory:**\n\n"
            for item in matching_inventory:
                response += f"{item}\n"
        if matching_transactions:
            response += "\n📋 **Active Transactions:**\n\n"
            for item in matching_transactions:
                response += f"{item}\n"
        if matching_overdue:
            response += "\n⚠️ **Overdue:**\n\n"
            for item in matching_overdue:
                response += f"{item}\n"
        return response
    
    # Default comprehensive response
    return f"""I can help you find components and track who has them!

📦 **Current Inventory:**
{inventory if inventory != "No components in inventory." else "No components added yet."}

📋 **Active Transactions:**
{transactions if transactions != "No active transactions." else "No active transactions."}

⚠️ **Overdue Items:**
{overdue if overdue != "No overdue components." else "None - all items returned on time!"}

💡 **Try asking:**
- "Where is the ESP32?"
- "Who has the Arduino?"
- "What sensors are available?"
- "Show overdue items" """


def generate_suggestions(query: str) -> list:
    """Generate follow-up suggestions based on the query."""
    suggestions = [
        "What components are currently available?",
        "Who has overdue items?",
        "Show me all pending requests",
        "What sensors do we have in stock?"
    ]
    
    query_lower = query.lower()
    
    if "esp32" in query_lower:
        suggestions = [
            "How many ESP32 are available?",
            "Who else has ESP32?",
            "What are ESP32 specifications?",
            "Any overdue ESP32?"
        ]
    elif "overdue" in query_lower:
        suggestions = [
            "Send reminders to overdue users",
            "Which items are most overdue?",
            "Show me the borrower's contact info",
            "What's the return policy?"
        ]
    elif "available" in query_lower:
        suggestions = [
            "Show me sensor availability",
            "What microcontrollers are in stock?",
            "Any low stock items?",
            "Reserve a component for me"
        ]
    
    return suggestions[:4]


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get all conversations for the current user."""
    db = get_database()
    
    cursor = db.chat_history.find(
        {"user_id": current_user.id}
    ).sort("updated_at", -1).limit(50)
    
    conversations = await cursor.to_list(length=50)
    
    conv_list = [
        ConversationResponse(
            id=str(c["_id"]),
            title=c.get("title"),
            messages=[
                ChatMessage(
                    role=MessageRole(m["role"]),
                    content=m["content"],
                    timestamp=m.get("timestamp", c["created_at"])
                )
                for m in c.get("messages", [])
            ],
            created_at=c["created_at"],
            updated_at=c["updated_at"]
        )
        for c in conversations
    ]
    
    return ConversationListResponse(
        conversations=conv_list,
        total=len(conv_list)
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific conversation."""
    db = get_database()
    
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )
    
    conversation = await db.chat_history.find_one({
        "_id": ObjectId(conversation_id),
        "user_id": current_user.id
    })
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return ConversationResponse(
        id=str(conversation["_id"]),
        title=conversation.get("title"),
        messages=[
            ChatMessage(
                role=MessageRole(m["role"]),
                content=m["content"],
                timestamp=m.get("timestamp", conversation["created_at"])
            )
            for m in conversation.get("messages", [])
        ],
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"]
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a conversation."""
    db = get_database()
    
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )
    
    result = await db.chat_history.delete_one({
        "_id": ObjectId(conversation_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
