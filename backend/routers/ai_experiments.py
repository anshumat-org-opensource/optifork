# routers/ai_experiments.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json
import os
from pathlib import Path

from db import get_db
from ai_experiments import crud
from ai_experiments.schemas import (
    AIExperimentOut, AIExperimentCreate, AIExperimentDetail,
    PromptConfigOut, PromptConfigCreate,
    ModelConfigOut, ModelConfigCreate,
    EvaluationDatasetOut, EvaluationDatasetCreate,
    EvaluationRunOut, EvaluationRunCreate, EvaluationRunDetail,
    EvaluationResultOut, EvaluationSummary,
    OfflineEvaluationRequest
)

router = APIRouter(prefix="/ai-experiments", tags=["AI Experiments"])

# AI Experiment endpoints
@router.post("/", response_model=AIExperimentOut)
async def create_ai_experiment(
    experiment: AIExperimentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new AI experiment"""
    # Check if experiment name already exists
    existing = await crud.get_ai_experiment_by_name(db, experiment.name)
    if existing:
        raise HTTPException(status_code=400, detail="AI experiment with this name already exists")
    
    return await crud.create_ai_experiment(db, experiment)

@router.get("/", response_model=List[AIExperimentOut])
async def list_ai_experiments(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all AI experiments"""
    return await crud.get_ai_experiments(db, skip=skip, limit=limit)

@router.put("/{experiment_id}/status")
async def update_ai_experiment_status(
    experiment_id: int,
    status: str,
    db: AsyncSession = Depends(get_db)
):
    """Update AI experiment status"""
    valid_statuses = ["draft", "running", "completed", "archived"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    experiment = await crud.update_ai_experiment_status(db, experiment_id, status)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    
    return {"message": f"Experiment status updated to {status}"}

# Prompt Config endpoints
@router.post("/{experiment_id}/prompts", response_model=PromptConfigOut)
async def create_prompt_config(
    experiment_id: int,
    prompt_config: PromptConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new prompt configuration"""
    # Verify experiment exists
    experiment = await crud.get_ai_experiment_by_id(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    
    return await crud.create_prompt_config(db, prompt_config, experiment_id)

@router.get("/{experiment_id}/prompts", response_model=List[PromptConfigOut])
async def list_prompt_configs(
    experiment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all prompt configurations for an experiment"""
    return await crud.get_prompt_configs(db, experiment_id)


# Model Config endpoints
@router.post("/{experiment_id}/models", response_model=ModelConfigOut)
async def create_model_config(
    experiment_id: int,
    model_config: ModelConfigCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new model configuration"""
    # Verify experiment exists
    experiment = await crud.get_ai_experiment_by_id(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    
    return await crud.create_model_config(db, model_config, experiment_id)

@router.get("/{experiment_id}/models", response_model=List[ModelConfigOut])
async def list_model_configs(
    experiment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all model configurations for an experiment"""
    return await crud.get_model_configs(db, experiment_id)


# Evaluation Dataset endpoints
@router.post("/{experiment_id}/datasets", response_model=EvaluationDatasetOut)
async def create_evaluation_dataset(
    experiment_id: int,
    dataset: EvaluationDatasetCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new evaluation dataset"""
    # Verify experiment exists
    experiment = await crud.get_ai_experiment_by_id(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    
    return await crud.create_evaluation_dataset(db, dataset, experiment_id)

@router.post("/{experiment_id}/datasets/upload")
async def upload_evaluation_dataset(
    experiment_id: int,
    file: UploadFile = File(...),
    name: str = None,
    description: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Upload an evaluation dataset file"""
    # Verify experiment exists
    experiment = await crud.get_ai_experiment_by_id(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    
    # Validate file type
    allowed_extensions = {".json", ".jsonl", ".csv"}
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/datasets")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = upload_dir / f"{experiment_id}_{file.filename}"
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Parse and count samples
    sample_count = 0
    try:
        if file_extension == ".json":
            data = json.loads(content.decode())
            sample_count = len(data) if isinstance(data, list) else 1
        elif file_extension == ".jsonl":
            sample_count = len(content.decode().strip().split('\n'))
        elif file_extension == ".csv":
            sample_count = len(content.decode().strip().split('\n')) - 1  # Exclude header
    except Exception as e:
        # File saved but couldn't parse - that's ok
        pass
    
    # Create dataset record
    dataset_data = EvaluationDatasetCreate(
        name=name or file.filename,
        description=description,
        dataset_type=file_extension[1:],  # Remove dot
        file_path=str(file_path),
        sample_count=sample_count
    )
    
    return await crud.create_evaluation_dataset(db, dataset_data, experiment_id)

@router.get("/{experiment_id}/datasets", response_model=List[EvaluationDatasetOut])
async def list_evaluation_datasets(
    experiment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all evaluation datasets for an experiment"""
    return await crud.get_evaluation_datasets(db, experiment_id)

# Evaluation Run endpoints
@router.post("/evaluate", response_model=EvaluationRunOut)
async def start_offline_evaluation(
    evaluation_request: OfflineEvaluationRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start an offline evaluation run"""
    # Verify experiment exists
    experiment = await crud.get_ai_experiment_by_id(db, evaluation_request.experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    
    # Get dataset
    datasets = await crud.get_evaluation_datasets(db, evaluation_request.experiment_id)
    dataset = next((d for d in datasets if d.id == evaluation_request.dataset_id), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Evaluation dataset not found")
    
    # Create evaluation run
    run_data = EvaluationRunCreate(
        ai_experiment_id=evaluation_request.experiment_id,
        dataset_id=evaluation_request.dataset_id,
        name=evaluation_request.evaluation_name,
        total_samples=min(dataset.sample_count, evaluation_request.sample_limit or dataset.sample_count)
    )
    
    evaluation_run = await crud.create_evaluation_run(db, run_data)
    
    # TODO: Start background task for actual evaluation
    # For now, just mark as pending
    
    return evaluation_run

@router.get("/{experiment_id}/runs", response_model=List[EvaluationRunOut])
async def list_evaluation_runs(
    experiment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """List all evaluation runs for an experiment"""
    return await crud.get_evaluation_runs(db, experiment_id)

@router.get("/runs/{run_id}", response_model=EvaluationRunDetail)
async def get_evaluation_run(
    run_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed evaluation run results"""
    # Get the run
    runs = await crud.get_evaluation_runs(db, None)  # We'll need to modify this
    run = next((r for r in runs if r.id == run_id), None)
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    
    # Get results
    results = await crud.get_evaluation_results(db, run_id)
    
    return {
        **run.__dict__,
        "results": results
    }

@router.get("/{experiment_id}/summary", response_model=EvaluationSummary)
async def get_evaluation_summary(
    experiment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get evaluation summary for an AI experiment"""
    return await crud.get_evaluation_summary(db, experiment_id)

# Test endpoint for development
@router.post("/test")
async def test_ai_experiment():
    """Test endpoint to verify AI experiments are working"""
    return {
        "message": "AI Experiments API is working!",
        "features": [
            "Create AI experiments",
            "Configure prompts and models", 
            "Upload evaluation datasets",
            "Run offline evaluations",
            "Compare results"
        ]
    }

@router.get("/test-simple")
async def test_simple_endpoint():
    """Test simple endpoint"""
    return {"message": "Simple endpoint working"}

# Note: Keep /{experiment_id} route at the end since it's a catch-all pattern
@router.get("/{experiment_id}", response_model=AIExperimentDetail)
async def get_ai_experiment(
    experiment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get AI experiment by ID with full details"""
    experiment = await crud.get_ai_experiment_by_id(db, experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="AI experiment not found")
    return experiment
