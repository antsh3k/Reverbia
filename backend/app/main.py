"""
Reverbia FastAPI Backend Application
Main application entry point with health check endpoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title="Reverbia API",
    description="AI-powered meeting intelligence platform backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Import auth components
from app.auth.routes import router as auth_router
from app.auth.middleware import add_auth_middleware

# Import API routes
from app.api.upload import router as upload_router
from app.api.meetings import router as meetings_router

# Add authentication routes
app.include_router(auth_router)

# Add API routes
app.include_router(upload_router)
app.include_router(meetings_router)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware
add_auth_middleware(app)


@app.get("/")
async def root():
    """Root endpoint returning basic API information"""
    return {
        "message": "Reverbia API",
        "version": "1.0.0",
        "status": "active",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring and load balancers"""
    return {
        "status": "healthy",
        "service": "reverbia-api",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with service dependencies"""
    from app.database.connection import test_database_connection, check_required_tables
    from datetime import datetime
    
    # Check database connection
    db_status = await test_database_connection()
    db_health = "healthy" if db_status["status"] == "success" else "unhealthy" if db_status["configured"] else "not_configured"
    
    # Check required tables if database is connected
    tables_status = "not_checked"
    if db_health == "healthy":
        tables_check = check_required_tables()
        tables_status = "healthy" if tables_check["status"] == "success" else "unhealthy"
    
    checks = {
        "api": "healthy",
        "database": db_health,
        "database_tables": tables_status,
        "storage": "not_configured",   # Will be updated when file storage is implemented
        "openai": "not_configured",    # Will be updated in Task 5
    }
    
    overall_status = "healthy" if all(status in ["healthy", "not_configured", "not_checked"] for status in checks.values()) else "unhealthy"
    
    return {
        "status": overall_status,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "False").lower() == "true"
    )