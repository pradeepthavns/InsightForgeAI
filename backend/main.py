from pathlib import Path

from fastapi import HTTPException

from services.dataset_service import load_dataset, get_basic_info, get_dataset_profile

from services.eda_service import get_eda_summary

from services.findings_service import generate_findings

from services.target_service import detect_target

from services.preprocessing_service import (
    prepare_dataset,
    get_preprocessing_summary,
)

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
@app.get("/dataset/{dataset_id}")
def get_dataset_info(dataset_id: str):
    matching_files = list(UPLOAD_DIR.glob(f"{dataset_id}.*"))

    if not matching_files:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found."
        )

    file_path = matching_files[0]

    try:
        df = load_dataset(file_path)
        profile = get_dataset_profile(df)

        return {
            "dataset_id": dataset_id,
            "filename": file_path.name,
            **profile,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not process dataset: {error}"
        )
@app.get("/dataset/{dataset_id}/eda")
def get_dataset_eda(dataset_id: str):
    matching_files = list(
        UPLOAD_DIR.glob(f"{dataset_id}.*")
    )

    if not matching_files:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    file_path = matching_files[0]

    try:
        df = load_dataset(file_path)

        eda = get_eda_summary(df)

        return {
            "dataset_id": dataset_id,
            "filename": file_path.name,
            **eda,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate EDA: {error}",
        )
@app.get("/dataset/{dataset_id}/findings")
def get_dataset_findings(dataset_id: str):
    matching_files = list(
        UPLOAD_DIR.glob(f"{dataset_id}.*")
    )

    if not matching_files:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    file_path = matching_files[0]

    try:
        df = load_dataset(file_path)

        profile = get_dataset_profile(df)

        eda = get_eda_summary(df)

        findings = generate_findings(
            df,
            profile,
            eda,
        )

        return {
            "dataset_id": dataset_id,
            "filename": file_path.name,
            "findings": findings,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not generate findings: {error}",
        )
@app.get("/dataset/{dataset_id}/target")
def get_dataset_target(dataset_id: str):

    matching_files = list(
        UPLOAD_DIR.glob(f"{dataset_id}.*")
    )

    if not matching_files:

        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    file_path = matching_files[0]

    try:

        df = load_dataset(file_path)

        target_result = detect_target(df)

        return {
            "dataset_id": dataset_id,
            "filename": file_path.name,
            **target_result,
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Could not detect target: {error}",
        )
@app.get("/dataset/{dataset_id}/preprocess")
def preprocess_dataset(
    dataset_id: str,
    target: str,
):
    matching_files = list(
        UPLOAD_DIR.glob(f"{dataset_id}.*")
    )

    if not matching_files:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found.",
        )

    file_path = matching_files[0]

    try:
        df = load_dataset(file_path)

        result = prepare_dataset(
            df=df,
            target_column=target,
        )

        summary = get_preprocessing_summary(
            result
        )

        return {
            "dataset_id": dataset_id,
            "target": target,
            **summary,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not preprocess dataset: {error}",
        )