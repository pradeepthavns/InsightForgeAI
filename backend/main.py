from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


# Create the uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Maximum file size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file extensions
ALLOWED_EXTENSIONS = {".csv", ".xlsx"}


app = FastAPI(
    title="InsightForgeAI API",
    description="Backend API for the InsightForgeAI automated EDA and AutoML platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    # Check that a file was actually selected
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file was provided.",
        )

    # Check file extension
    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a CSV or XLSX file.",
        )

    # Read the uploaded file
    file_content = await file.read()

    # Check file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum allowed size is 10 MB.",
        )

    # Generate a unique ID
    dataset_id = str(uuid4())

    # Create a unique stored filename
    stored_filename = f"{dataset_id}{file_extension}"

    # Save the file
    file_path = UPLOAD_DIR / stored_filename
    file_path.write_bytes(file_content)

    return {
        "message": "Dataset uploaded successfully.",
        "dataset_id": dataset_id,
        "filename": file.filename,
        "file_type": file_extension,
        "file_size_bytes": len(file_content),
    }