"""
Enhanced AI Chat routes for LogGPT.
Features: Better context building, smarter prompts, accurate responses.
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import openai
from google import genai
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
import re

router = APIRouter(prefix="/chat", tags=["AI Chat"])


# =====================
# Enhanced Context Builders
# =====================

async def get_detailed_inventory_context(db) -> Dict[str, Any]:
    """Get comprehensive inventory data with rich details."""
    components = await db.components.find().to_list(length=200)
    
    inventory_data = {
        "components": [],
        "by_category": {},
        "low_stock": [],
        "out_of_stock": [],
        "total_types": len(components),
        "total_items": 0,
        "total_available": 0
    }
    
    for c in components:
        comp_info = {
            "id": str(c["_id"]),
            "name": c["name"],
            "category": c["category"],
            "total": c["total_quantity"],
            "available": c["available_quantity"],
            "issued": c["total_quantity"] - c["available_quantity"],
            "location": c.get("location", "Not specified"),
            "description": c.get("description", ""),
            "tags": c.get("tags", [])
        }
        
        inventory_data["components"].append(comp_info)
        inventory_data["total_items"] += c["total_quantity"]
        inventory_data["total_available"] += c["available_quantity"]
        
        # Group by category
        cat = c["category"]
        if cat not in inventory_data["by_category"]:
            inventory_data["by_category"][cat] = []
        inventory_data["by_category"][cat].append(comp_info)
        
        # Track low/out of stock
        if c["available_quantity"] == 0:
            inventory_data["out_of_stock"].append(comp_info)
        elif c["available_quantity"] <= 2:
            inventory_data["low_stock"].append(comp_info)
    
    return inventory_data


async def get_detailed_transactions_context(db) -> Dict[str, Any]:
    """Get comprehensive transaction data."""
    now = datetime.utcnow()
    
    # Active transactions
    active = await db.transactions.find({
        "status": {"$in": [TransactionStatus.ISSUED.value, TransactionStatus.PENDING.value]}
    }).sort("created_at", -1).to_list(length=100)
    
    # Overdue transactions
    overdue = await db.transactions.find({
        "status": TransactionStatus.ISSUED.value,
        "due_date": {"$lt": now}
    }).to_list(length=50)
    
    # Recent returns (last 7 days)
    week_ago = now - timedelta(days=7)
    recent_returns = await db.transactions.find({
        "status": TransactionStatus.RETURNED.value,
        "return_date": {"$gte": week_ago}
    }).sort("return_date", -1).to_list(length=20)
    
    # Build transaction data
    tx_data = {
        "active": [],
        "overdue": [],
        "recent_returns": [],
        "by_student": {},
        "by_component": {},
        "total_active": len(active),
        "total_overdue": len(overdue)
    }
    
    for t in active:
        tx_info = {
            "id": str(t["_id"]),
            "component_name": t["component_name"],
            "component_id": t["component_id"],
            "quantity": t["quantity"],
            "student_name": t["user_name"],
            "student_roll": t.get("roll_number", t.get("user_email", "N/A")),
            "status": t["status"],
            "issue_date": t.get("issue_date", t["created_at"]).strftime("%Y-%m-%d"),
            "due_date": t["due_date"].strftime("%Y-%m-%d") if t.get("due_date") else "Not set"
        }
        
        # Check if overdue
        if t.get("due_date") and t["due_date"] < now:
            days_overdue = (now - t["due_date"]).days
            tx_info["days_overdue"] = days_overdue
            tx_info["is_overdue"] = True
        else:
            tx_info["is_overdue"] = False
            
        tx_data["active"].append(tx_info)
        
        # Group by student
        student = t["user_name"]
        if student not in tx_data["by_student"]:
            tx_data["by_student"][student] = {"items": [], "roll": t.get("roll_number", "N/A")}
        tx_data["by_student"][student]["items"].append(tx_info)
        
        # Group by component
        comp = t["component_name"]
        if comp not in tx_data["by_component"]:
            tx_data["by_component"][comp] = []
        tx_data["by_component"][comp].append(tx_info)
    
    for t in overdue:
        days_overdue = (now - t["due_date"]).days
        tx_data["overdue"].append({
            "component_name": t["component_name"],
            "quantity": t["quantity"],
            "student_name": t["user_name"],
            "student_roll": t.get("roll_number", "N/A"),
            "due_date": t["due_date"].strftime("%Y-%m-%d"),
            "days_overdue": days_overdue
        })
    
    for t in recent_returns:
        tx_data["recent_returns"].append({
            "component_name": t["component_name"],
            "quantity": t["quantity"],
            "student_name": t["user_name"],
            "return_date": t["return_date"].strftime("%Y-%m-%d") if t.get("return_date") else "N/A"
        })
    
    return tx_data


async def get_stats_context(db) -> Dict[str, Any]:
    """Get quick statistics for the AI."""
    now = datetime.utcnow()
    
    total_components = await db.components.count_documents({})
    total_borrowed = await db.transactions.count_documents({"status": TransactionStatus.ISSUED.value})
    total_overdue = await db.transactions.count_documents({
        "status": TransactionStatus.ISSUED.value,
        "due_date": {"$lt": now}
    })
    
    # Top borrowed components
    pipeline = [
        {"$match": {"status": TransactionStatus.ISSUED.value}},
        {"$group": {"_id": "$component_name", "count": {"$sum": "$quantity"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_borrowed = await db.transactions.aggregate(pipeline).to_list(length=5)
    
    return {
        "total_component_types": total_components,
        "active_borrows": total_borrowed,
        "overdue_count": total_overdue,
        "top_borrowed": [{"name": t["_id"], "count": t["count"]} for t in top_borrowed]
    }


def build_enhanced_system_prompt(inventory: Dict, transactions: Dict, stats: Dict, user_role: str) -> str:
    """Build a comprehensive, accurate system prompt."""
    
    # Format inventory section
    inv_summary = f"""
## INVENTORY SUMMARY
- Total Component Types: {inventory['total_types']}
- Total Items: {inventory['total_items']}
- Available Items: {inventory['total_available']}
- Out of Stock: {len(inventory['out_of_stock'])} types
- Low Stock (≤2): {len(inventory['low_stock'])} types

### Components by Category:
"""
    for cat, items in inventory["by_category"].items():
        inv_summary += f"\n**{cat.upper()}:**\n"
        for item in items:
            status = "⚠️ OUT OF STOCK" if item["available"] == 0 else f"✓ {item['available']}/{item['total']} available"
            inv_summary += f"  - {item['name']}: {status} | Location: {item['location']}\n"
    
    # Format transactions section
    tx_summary = f"""
## ACTIVE BORROWS ({transactions['total_active']} total)
"""
    if transactions["active"]:
        for tx in transactions["active"][:20]:  # Show top 20
            overdue_mark = "🔴 OVERDUE" if tx.get("is_overdue") else ""
            tx_summary += f"  - {tx['component_name']} x{tx['quantity']} → {tx['student_name']} (Roll: {tx['student_roll']}) - Due: {tx['due_date']} {overdue_mark}\n"
    else:
        tx_summary += "  No active borrows.\n"
    
    # Format overdue section
    overdue_summary = f"""
## OVERDUE ITEMS ({transactions['total_overdue']} total)
"""
    if transactions["overdue"]:
        for item in transactions["overdue"]:
            overdue_summary += f"  🔴 {item['component_name']} x{item['quantity']} - {item['student_name']} (Roll: {item['student_roll']}) - {item['days_overdue']} days overdue!\n"
    else:
        overdue_summary += "  ✅ No overdue items!\n"
    
    # Format who has what section
    who_has_what = """
## WHO HAS WHAT (By Student)
"""
    for student, data in list(transactions["by_student"].items())[:15]:
        who_has_what += f"\n**{student}** (Roll: {data['roll']}):\n"
        for item in data["items"]:
            who_has_what += f"  - {item['component_name']} x{item['quantity']}\n"
    
    system_prompt = f"""You are LogGPT, an intelligent AI assistant for the Hardware & IoT Components Room.
You have REAL-TIME access to the inventory database and can provide ACCURATE information.

TODAY'S DATE: {datetime.utcnow().strftime("%Y-%m-%d")}
USER ROLE: {user_role}

{inv_summary}

{tx_summary}

{overdue_summary}

{who_has_what}

## QUICK STATS
- Total component types: {stats['total_component_types']}
- Currently borrowed items: {stats['active_borrows']}
- Overdue items: {stats['overdue_count']}

## YOUR CAPABILITIES
1. **Find Components**: Tell users exactly where components are located
2. **Check Availability**: Show real-time stock levels
3. **Track Borrows**: Tell who has what component
4. **Identify Overdues**: Alert about overdue items
5. **Answer Questions**: About inventory, procedures, component specs

## RESPONSE GUIDELINES
1. **BE ACCURATE**: Only state facts from the data above. Never guess.
2. **BE SPECIFIC**: Include quantities, locations, names, dates.
3. **USE FORMATTING**: Use bullet points, bold for emphasis.
4. **HIGHLIGHT ISSUES**: Warn about low stock, overdue items.
5. **BE HELPFUL**: Suggest related components if something is unavailable.

## EXAMPLE ACCURATE RESPONSES

User: "Where is the Arduino?"
Response: Based on the inventory, I found:
- **Arduino Uno**: 5/10 available | Location: Shelf A-2
- **Arduino Nano**: 3/5 available | Location: Drawer B-1

User: "Who has ESP32?"
Response: According to current records:
- John (Roll: 21CS001) has 2x ESP32
- Sarah (Roll: 21EC005) has 1x ESP32

If a component is NOT in the database, say: "I don't have any record of [component] in the inventory."

IMPORTANT: Never make up data. Only use information from the context above."""

    return system_prompt


# =====================
# Smart Query Understanding
# =====================

def extract_query_intent(query: str) -> Dict[str, Any]:
    """Extract intent and entities from user query."""
    query_lower = query.lower()
    
    intent = {
        "type": "general",
        "components": [],
        "students": [],
        "actions": []
    }
    
    # Detect intent type
    if any(w in query_lower for w in ["where", "location", "find", "located"]):
        intent["type"] = "location"
    elif any(w in query_lower for w in ["who has", "who took", "who borrowed", "issued to"]):
        intent["type"] = "who_has"
    elif any(w in query_lower for w in ["available", "stock", "how many", "quantity", "left"]):
        intent["type"] = "availability"
    elif any(w in query_lower for w in ["overdue", "late", "pending", "due"]):
        intent["type"] = "overdue"
    elif any(w in query_lower for w in ["all", "list", "show", "inventory"]):
        intent["type"] = "list_all"
    elif any(w in query_lower for w in ["borrow", "take", "checkout", "issue"]):
        intent["type"] = "borrow_help"
    elif any(w in query_lower for w in ["return", "give back"]):
        intent["type"] = "return_help"
    
    # Extract component names (common electronics)
    components = [
        'arduino', 'esp32', 'esp8266', 'raspberry', 'pi', 'sensor', 'led', 
        'resistor', 'capacitor', 'motor', 'servo', 'stepper', 'display', 
        'oled', 'lcd', 'relay', 'transistor', 'diode', 'wire', 'breadboard',
        'jumper', 'cable', 'usb', 'battery', 'power', 'supply', 'module',
        'wifi', 'bluetooth', 'gps', 'ultrasonic', 'infrared', 'temperature',
        'humidity', 'pressure', 'accelerometer', 'gyroscope', 'camera',
        'microphone', 'speaker', 'buzzer', 'button', 'switch', 'potentiometer',
        'rfid', 'nfc', 'lora', 'gsm', 'sim', 'ethernet', 'shield'
    ]
    
    for comp in components:
        if comp in query_lower:
            intent["components"].append(comp)
    
    return intent


# =====================
# Main Chat Endpoint
# =====================

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to LogGPT and get an accurate response."""
    db = get_database()
    
    # Use anonymous user ID if not provided (for kiosk mode)
    user_id = "anonymous_kiosk"
    user_role = "student"
    
    # Get or create conversation
    conversation_id = request.conversation_id
    conversation = None
    
    if conversation_id and ObjectId.is_valid(conversation_id):
        conversation = await db.chat_history.find_one({
            "_id": ObjectId(conversation_id),
            "user_id": user_id
        })
    
    if not conversation:
        conversation = {
            "user_id": user_id,
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.chat_history.insert_one(conversation)
        conversation_id = str(result.inserted_id)
    else:
        conversation_id = str(conversation["_id"])
    
    # Get comprehensive context
    inventory = await get_detailed_inventory_context(db)
    transactions = await get_detailed_transactions_context(db)
    stats = await get_stats_context(db)
    
    # Build enhanced system prompt
    system_prompt = build_enhanced_system_prompt(
        inventory, transactions, stats, user_role
    )
    
    # Extract query intent for smarter responses
    intent = extract_query_intent(request.message)
    
    # Build messages
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history (last 6 messages for context)
    if conversation.get("messages"):
        for msg in conversation["messages"][-6:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
    
    # Add current user message
    messages.append({"role": "user", "content": request.message})
    
    # Generate response
    assistant_message = None
    
    try:
        if settings.gemini_api_key:
            # Use Google Gemini with enhanced prompt
            client = genai.Client(api_key=settings.gemini_api_key)
            
            # Build conversation for Gemini
            gemini_prompt = f"{system_prompt}\n\n--- CONVERSATION ---\n\n"
            for msg in messages[1:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                gemini_prompt += f"{role}: {msg['content']}\n\n"
            gemini_prompt += "Assistant: "
            
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=gemini_prompt,
                config={
                    "temperature": 0.3,  # Lower for more factual responses
                    "top_p": 0.8,
                    "max_output_tokens": 1500
                }
            )
            assistant_message = response.text
            
        elif settings.openai_api_key:
            client = openai.OpenAI(api_key=settings.openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=1500,
                temperature=0.3
            )
            assistant_message = response.choices[0].message.content
            
    except Exception as e:
        print(f"AI API error: {str(e)}")
    
    # Use smart fallback if AI failed
    if not assistant_message:
        assistant_message = generate_smart_fallback(
            request.message, intent, inventory, transactions, stats
        )
    
    # Save to conversation
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
    
    # Generate contextual suggestions
    suggestions = generate_smart_suggestions(intent, inventory, transactions)
    
    return ChatResponse(
        message=assistant_message,
        conversation_id=conversation_id,
        suggestions=suggestions
    )


# =====================
# Smart Fallback Response
# =====================

def generate_smart_fallback(
    query: str, 
    intent: Dict, 
    inventory: Dict, 
    transactions: Dict,
    stats: Dict
) -> str:
    """Generate accurate response based on actual data."""
    
    query_lower = query.lower()
    
    # Search for matching components
    search_terms = intent["components"]
    if not search_terms:
        # Extract any potential component names from query
        words = re.findall(r'\b\w{3,}\b', query_lower)
        search_terms = [w for w in words if w not in [
            'the', 'what', 'where', 'which', 'who', 'has', 'have', 'are', 
            'is', 'can', 'how', 'many', 'much', 'show', 'find', 'get',
            'available', 'stock', 'location', 'located', 'currently'
        ]]
    
    # Find matching inventory items
    matching_components = []
    for comp in inventory["components"]:
        comp_lower = comp["name"].lower()
        for term in search_terms:
            if term in comp_lower or term in comp.get("description", "").lower():
                matching_components.append(comp)
                break
    
    # Find matching transactions
    matching_transactions = []
    for tx in transactions["active"]:
        tx_lower = tx["component_name"].lower()
        for term in search_terms:
            if term in tx_lower:
                matching_transactions.append(tx)
                break
    
    # Handle different intents
    if intent["type"] == "location" or "where" in query_lower:
        if matching_components:
            response = "📍 **Component Location(s):**\n\n"
            for comp in matching_components:
                status = f"✅ {comp['available']}/{comp['total']} available" if comp['available'] > 0 else "❌ Out of stock"
                response += f"**{comp['name']}**\n"
                response += f"  - Location: {comp['location']}\n"
                response += f"  - Status: {status}\n\n"
            
            if matching_transactions:
                response += "📋 **Currently borrowed by:**\n"
                for tx in matching_transactions:
                    response += f"  - {tx['student_name']} ({tx['student_roll']}): {tx['quantity']}x\n"
            return response
        else:
            return f"❌ I couldn't find any component matching '{' '.join(search_terms)}' in the inventory.\n\n💡 Try searching for: Arduino, ESP32, sensors, LED, etc."
    
    elif intent["type"] == "who_has" or ("who" in query_lower and "has" in query_lower):
        if matching_transactions:
            response = "👤 **Currently Borrowed:**\n\n"
            for tx in matching_transactions:
                overdue = " 🔴 OVERDUE" if tx.get("is_overdue") else ""
                response += f"**{tx['component_name']}** x{tx['quantity']}\n"
                response += f"  - Student: {tx['student_name']}\n"
                response += f"  - Roll: {tx['student_roll']}\n"
                response += f"  - Due: {tx['due_date']}{overdue}\n\n"
            return response
        elif search_terms:
            return f"✅ No one currently has '{' '.join(search_terms)}' borrowed. It should be available in the inventory."
        else:
            # Show all who has what
            if transactions["by_student"]:
                response = "👥 **Who Has What:**\n\n"
                for student, data in list(transactions["by_student"].items())[:10]:
                    response += f"**{student}** (Roll: {data['roll']}):\n"
                    for item in data["items"]:
                        response += f"  - {item['component_name']} x{item['quantity']}\n"
                    response += "\n"
                return response
            return "✅ No components are currently borrowed."
    
    elif intent["type"] == "availability" or "available" in query_lower:
        if matching_components:
            response = "📦 **Availability:**\n\n"
            for comp in matching_components:
                if comp['available'] > 0:
                    response += f"✅ **{comp['name']}**: {comp['available']}/{comp['total']} available\n"
                    response += f"   Location: {comp['location']}\n\n"
                else:
                    response += f"❌ **{comp['name']}**: Out of stock (0/{comp['total']})\n"
                    # Show who has it
                    for tx in transactions["active"]:
                        if tx["component_name"].lower() == comp["name"].lower():
                            response += f"   → Borrowed by: {tx['student_name']}\n"
                    response += "\n"
            return response
        else:
            # Show general availability
            response = "📦 **Inventory Overview:**\n\n"
            response += f"Total component types: {inventory['total_types']}\n"
            response += f"Available items: {inventory['total_available']}/{inventory['total_items']}\n\n"
            
            if inventory['out_of_stock']:
                response += "❌ **Out of Stock:**\n"
                for comp in inventory['out_of_stock'][:5]:
                    response += f"  - {comp['name']}\n"
                response += "\n"
            
            if inventory['low_stock']:
                response += "⚠️ **Low Stock:**\n"
                for comp in inventory['low_stock'][:5]:
                    response += f"  - {comp['name']}: {comp['available']} left\n"
            
            return response
    
    elif intent["type"] == "overdue" or "overdue" in query_lower:
        if transactions["overdue"]:
            response = f"🔴 **Overdue Items ({len(transactions['overdue'])}):**\n\n"
            for item in transactions["overdue"]:
                response += f"**{item['component_name']}** x{item['quantity']}\n"
                response += f"  - Student: {item['student_name']} ({item['student_roll']})\n"
                response += f"  - Due: {item['due_date']} ({item['days_overdue']} days overdue)\n\n"
            return response
        else:
            return "✅ **Great news!** There are no overdue items at the moment."
    
    elif intent["type"] == "list_all" or "all" in query_lower or "list" in query_lower:
        response = f"📋 **Inventory Summary:**\n\n"
        response += f"Total types: {inventory['total_types']}\n"
        response += f"Total items: {inventory['total_items']}\n"
        response += f"Available: {inventory['total_available']}\n\n"
        
        for cat, items in inventory["by_category"].items():
            response += f"**{cat.upper()}:**\n"
            for item in items[:5]:  # Limit per category
                status = f"{item['available']}/{item['total']}" if item['available'] > 0 else "OUT"
                response += f"  - {item['name']}: {status}\n"
            if len(items) > 5:
                response += f"  ... and {len(items) - 5} more\n"
            response += "\n"
        
        return response
    
    # Default: show matching items or general help
    if matching_components or matching_transactions:
        response = ""
        if matching_components:
            response += "📦 **Found in Inventory:**\n\n"
            for comp in matching_components:
                status = f"✅ {comp['available']}/{comp['total']}" if comp['available'] > 0 else "❌ Out of stock"
                response += f"**{comp['name']}** - {status}\n"
                response += f"  Location: {comp['location']}\n\n"
        
        if matching_transactions:
            response += "📋 **Active Borrows:**\n"
            for tx in matching_transactions:
                response += f"  - {tx['component_name']} → {tx['student_name']}\n"
        
        return response
    
    # General help response
    return f"""🤖 **How can I help you?**

I have access to the components room inventory. Here's what I can tell you:

📊 **Quick Stats:**
- {stats['total_component_types']} component types
- {stats['active_borrows']} items currently borrowed
- {stats['overdue_count']} overdue items

💡 **Try asking:**
- "Where is the Arduino?"
- "Who has the ESP32?"
- "What sensors are available?"
- "Show all overdue items"
- "List all components"

Just ask me about any component and I'll give you accurate information!"""


def generate_smart_suggestions(intent: Dict, inventory: Dict, transactions: Dict) -> List[str]:
    """Generate contextual follow-up suggestions."""
    suggestions = []
    
    if intent["type"] == "location":
        suggestions = [
            "What's available right now?",
            "Who has borrowed this?",
            "Show all components"
        ]
    elif intent["type"] == "who_has":
        suggestions = [
            "Show all overdue items",
            "What's the availability?",
            "List all active borrows"
        ]
    elif intent["type"] == "availability":
        suggestions = [
            "Where can I find this?",
            "What's out of stock?",
            "Show low stock items"
        ]
    elif intent["type"] == "overdue":
        suggestions = [
            "Who has what?",
            "Show all active borrows",
            "List available components"
        ]
    else:
        # Default suggestions based on current state
        suggestions = ["What's available?", "Show overdue items", "List all components"]
        
        if inventory["out_of_stock"]:
            suggestions.append(f"What about {inventory['out_of_stock'][0]['name']}?")
        
        if transactions["active"]:
            suggestions.append("Who has borrowed components?")
    
    return suggestions[:4]  # Return max 4 suggestions


# =====================
# Conversation Management Endpoints
# =====================

@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    current_user: UserResponse = Depends(get_current_user)
):
    """List all conversations for the current user."""
    db = get_database()
    
    conversations = await db.chat_history.find({
        "user_id": current_user.id
    }).sort("updated_at", -1).to_list(length=50)
    
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


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get a specific conversation with all messages."""
    db = get_database()
    
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conversation = await db.chat_history.find_one({
        "_id": ObjectId(conversation_id),
        "user_id": current_user.id
    })
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "id": str(conversation["_id"]),
        "title": conversation.get("title", "Untitled"),
        "messages": [
            {
                "role": m["role"],
                "content": m["content"],
                "timestamp": m.get("timestamp", conversation["created_at"]).isoformat()
            }
            for m in conversation.get("messages", [])
        ],
        "created_at": conversation["created_at"].isoformat(),
        "updated_at": conversation["updated_at"].isoformat()
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Delete a conversation."""
    db = get_database()
    
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    result = await db.chat_history.delete_one({
        "_id": ObjectId(conversation_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {"message": "Conversation deleted"}


@router.get("/history")
async def get_chat_history(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get chat history for the current user."""
    db = get_database()
    
    conversations = await db.chat_history.find({
        "user_id": current_user.id
    }).sort("updated_at", -1).to_list(length=50)
    
    return {
        "conversations": [
            {
                "id": str(c["_id"]),
                "title": c.get("title", "Untitled"),
                "created_at": c["created_at"].isoformat(),
                "updated_at": c["updated_at"].isoformat(),
                "message_count": len(c.get("messages", []))
            }
            for c in conversations
        ]
    }


@router.delete("/history")
async def clear_chat_history(
    current_user: UserResponse = Depends(get_current_user)
):
    """Clear all chat history for the current user."""
    db = get_database()
    
    await db.chat_history.delete_many({"user_id": current_user.id})
    
    return {"message": "Chat history cleared"}
