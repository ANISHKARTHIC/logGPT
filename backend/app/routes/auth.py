from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from bson import ObjectId
from ..database import get_database
from ..models import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    UserRole
)
from ..auth import (
    get_password_hash,
    verify_password,
    create_tokens,
    decode_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user account."""
    db = get_database()
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_doc = {
        "email": user_data.email,
        "name": user_data.name,
        "hashed_password": get_password_hash(user_data.password),
        "role": user_data.role.value,
        "department": user_data.department,
        "student_id": user_data.student_id,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create tokens
    access_token, refresh_token = create_tokens(user_id, user_data.email, user_data.role.value)
    
    # Return response
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        department=user_data.department,
        student_id=user_data.student_id,
        is_active=True,
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Authenticate user and return tokens."""
    db = get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    user_id = str(user["_id"])
    
    # Create tokens
    access_token, refresh_token = create_tokens(user_id, user["email"], user["role"])
    
    # Return response
    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=UserRole(user["role"]),
        department=user.get("department"),
        student_id=user.get("student_id"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh):
    """Refresh access token using refresh token."""
    payload = decode_token(token_data.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    user_id = payload.get("sub")
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Create new tokens
    access_token, refresh_token = create_tokens(user_id, user["email"], user["role"])
    
    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        role=UserRole(user["role"]),
        department=user.get("department"),
        student_id=user.get("student_id"),
        is_active=user.get("is_active", True),
        created_at=user["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.post("/logout")
async def logout(current_user: UserResponse = Depends(get_current_user)):
    """Logout current user (client should discard tokens)."""
    # In a production app, you might want to blacklist the token
    return {"message": "Successfully logged out"}
