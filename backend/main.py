from fastapi import FastAPI

app = FastAPI(
    title="InsightForgeAI API",
    description="Backend API for the InsightForgeAI automated EDA and AutoML platform.",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to InsightForgeAI API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "InsightForgeAI backend",
    }