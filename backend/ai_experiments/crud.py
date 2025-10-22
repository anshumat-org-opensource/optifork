# ai_experiments/crud.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime

from models import (
    AIExperiment, PromptConfig, ModelConfig, 
    EvaluationDataset, EvaluationRun, EvaluationResult, EvaluationMetric
)
from .schemas import (
    AIExperimentCreate, PromptConfigCreate, ModelConfigCreate,
    EvaluationDatasetCreate, EvaluationRunCreate
)

# AI Experiment CRUD
async def create_ai_experiment(db: AsyncSession, experiment: AIExperimentCreate) -> AIExperiment:
    """Create a new AI experiment"""
    db_experiment = AIExperiment(
        name=experiment.name,
        description=experiment.description,
        status="draft"
    )
    db.add(db_experiment)
    await db.commit()
    await db.refresh(db_experiment)
    return db_experiment

async def get_ai_experiments(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[AIExperiment]:
    """Get all AI experiments"""
    result = await db.execute(
        select(AIExperiment)
        .options(
            selectinload(AIExperiment.prompt_configs),
            selectinload(AIExperiment.model_configs),
            selectinload(AIExperiment.evaluation_datasets)
        )
        .offset(skip)
        .limit(limit)
        .order_by(AIExperiment.created_at.desc())
    )
    return result.scalars().all()

async def get_ai_experiment_by_id(db: AsyncSession, experiment_id: int) -> Optional[AIExperiment]:
    """Get AI experiment by ID"""
    result = await db.execute(
        select(AIExperiment)
        .options(
            selectinload(AIExperiment.prompt_configs),
            selectinload(AIExperiment.model_configs),
            selectinload(AIExperiment.evaluation_datasets),
            selectinload(AIExperiment.evaluation_runs)
        )
        .where(AIExperiment.id == experiment_id)
    )
    return result.scalar_one_or_none()

async def get_ai_experiment_by_name(db: AsyncSession, name: str) -> Optional[AIExperiment]:
    """Get AI experiment by name"""
    result = await db.execute(
        select(AIExperiment).where(AIExperiment.name == name)
    )
    return result.scalar_one_or_none()

async def update_ai_experiment_status(db: AsyncSession, experiment_id: int, status: str) -> Optional[AIExperiment]:
    """Update AI experiment status"""
    result = await db.execute(
        select(AIExperiment).where(AIExperiment.id == experiment_id)
    )
    experiment = result.scalar_one_or_none()
    if experiment:
        experiment.status = status
        experiment.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(experiment)
    return experiment

# Prompt Config CRUD
async def create_prompt_config(db: AsyncSession, prompt_config: PromptConfigCreate, experiment_id: int) -> PromptConfig:
    """Create a new prompt configuration"""
    db_prompt = PromptConfig(
        ai_experiment_id=experiment_id,
        name=prompt_config.name,
        version=prompt_config.version,
        prompt_template=prompt_config.prompt_template,
        system_message=prompt_config.system_message,
        temperature=prompt_config.temperature,
        max_tokens=prompt_config.max_tokens,
        stop_sequences=prompt_config.stop_sequences,
        variables=prompt_config.variables
    )
    db.add(db_prompt)
    await db.commit()
    await db.refresh(db_prompt)
    return db_prompt

async def get_prompt_configs(db: AsyncSession, experiment_id: int) -> List[PromptConfig]:
    """Get all prompt configs for an experiment"""
    result = await db.execute(
        select(PromptConfig)
        .where(PromptConfig.ai_experiment_id == experiment_id)
        .where(PromptConfig.is_active == True)
        .order_by(PromptConfig.created_at.desc())
    )
    return result.scalars().all()

async def get_prompt_config_by_id(db: AsyncSession, prompt_id: int) -> Optional[PromptConfig]:
    """Get prompt config by ID"""
    result = await db.execute(
        select(PromptConfig).where(PromptConfig.id == prompt_id)
    )
    return result.scalar_one_or_none()

async def update_prompt_config(db: AsyncSession, prompt_id: int, prompt_config: PromptConfigCreate) -> Optional[PromptConfig]:
    """Update a prompt configuration"""
    result = await db.execute(
        select(PromptConfig).where(PromptConfig.id == prompt_id)
    )
    db_prompt = result.scalar_one_or_none()
    if db_prompt:
        db_prompt.name = prompt_config.name
        db_prompt.version = prompt_config.version
        db_prompt.prompt_template = prompt_config.prompt_template
        db_prompt.system_message = prompt_config.system_message
        db_prompt.temperature = prompt_config.temperature
        db_prompt.max_tokens = prompt_config.max_tokens
        db_prompt.stop_sequences = prompt_config.stop_sequences
        db_prompt.variables = prompt_config.variables
        db_prompt.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(db_prompt)
    return db_prompt

async def delete_prompt_config(db: AsyncSession, prompt_id: int) -> bool:
    """Delete a prompt configuration (soft delete)"""
    result = await db.execute(
        select(PromptConfig).where(PromptConfig.id == prompt_id)
    )
    db_prompt = result.scalar_one_or_none()
    if db_prompt:
        db_prompt.is_active = False
        db_prompt.updated_at = datetime.utcnow()
        await db.commit()
        return True
    return False

# Model Config CRUD
async def create_model_config(db: AsyncSession, model_config: ModelConfigCreate, experiment_id: int) -> ModelConfig:
    """Create a new model configuration"""
    db_model = ModelConfig(
        ai_experiment_id=experiment_id,
        name=model_config.name,
        provider=model_config.provider,
        model_name=model_config.model_name,
        api_key_name=model_config.api_key_name,
        base_url=model_config.base_url,
        parameters=model_config.parameters
    )
    db.add(db_model)
    await db.commit()
    await db.refresh(db_model)
    return db_model

async def get_model_configs(db: AsyncSession, experiment_id: int) -> List[ModelConfig]:
    """Get all model configs for an experiment"""
    result = await db.execute(
        select(ModelConfig)
        .where(ModelConfig.ai_experiment_id == experiment_id)
        .where(ModelConfig.is_active == True)
        .order_by(ModelConfig.created_at.desc())
    )
    return result.scalars().all()

async def get_model_config_by_id(db: AsyncSession, model_id: int) -> Optional[ModelConfig]:
    """Get model config by ID"""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.id == model_id)
    )
    return result.scalar_one_or_none()

async def update_model_config(db: AsyncSession, model_id: int, model_config: ModelConfigCreate) -> Optional[ModelConfig]:
    """Update a model configuration"""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.id == model_id)
    )
    db_model = result.scalar_one_or_none()
    if db_model:
        db_model.name = model_config.name
        db_model.provider = model_config.provider
        db_model.model_name = model_config.model_name
        db_model.api_key_name = model_config.api_key_name
        db_model.base_url = model_config.base_url
        db_model.parameters = model_config.parameters
        db_model.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(db_model)
    return db_model

async def delete_model_config(db: AsyncSession, model_id: int) -> bool:
    """Delete a model configuration (soft delete)"""
    result = await db.execute(
        select(ModelConfig).where(ModelConfig.id == model_id)
    )
    db_model = result.scalar_one_or_none()
    if db_model:
        db_model.is_active = False
        db_model.updated_at = datetime.utcnow()
        await db.commit()
        return True
    return False

# Evaluation Dataset CRUD
async def create_evaluation_dataset(db: AsyncSession, dataset: EvaluationDatasetCreate, experiment_id: int) -> EvaluationDataset:
    """Create a new evaluation dataset"""
    db_dataset = EvaluationDataset(
        ai_experiment_id=experiment_id,
        name=dataset.name,
        description=dataset.description,
        dataset_type=dataset.dataset_type,
        file_path=dataset.file_path,
        sample_count=dataset.sample_count,
        schema_definition=dataset.schema_definition
    )
    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)
    return db_dataset

async def get_evaluation_datasets(db: AsyncSession, experiment_id: int) -> List[EvaluationDataset]:
    """Get all evaluation datasets for an experiment"""
    result = await db.execute(
        select(EvaluationDataset)
        .where(EvaluationDataset.ai_experiment_id == experiment_id)
        .order_by(EvaluationDataset.created_at.desc())
    )
    return result.scalars().all()

# Evaluation Run CRUD
async def create_evaluation_run(db: AsyncSession, run_data: EvaluationRunCreate) -> EvaluationRun:
    """Create a new evaluation run"""
    db_run = EvaluationRun(
        ai_experiment_id=run_data.ai_experiment_id,
        dataset_id=run_data.dataset_id,
        name=run_data.name,
        total_samples=run_data.total_samples,
        started_at=datetime.utcnow(),
        status="running"
    )
    db.add(db_run)
    await db.commit()
    await db.refresh(db_run)
    return db_run

async def get_evaluation_runs(db: AsyncSession, experiment_id: int) -> List[EvaluationRun]:
    """Get all evaluation runs for an experiment"""
    result = await db.execute(
        select(EvaluationRun)
        .options(selectinload(EvaluationRun.dataset))
        .where(EvaluationRun.ai_experiment_id == experiment_id)
        .order_by(EvaluationRun.created_at.desc())
    )
    return result.scalars().all()

async def update_evaluation_run_status(db: AsyncSession, run_id: int, status: str, **kwargs) -> Optional[EvaluationRun]:
    """Update evaluation run status and metrics"""
    result = await db.execute(
        select(EvaluationRun).where(EvaluationRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run:
        run.status = status
        if status == "completed":
            run.completed_at = datetime.utcnow()
        
        # Update optional fields
        for key, value in kwargs.items():
            if hasattr(run, key):
                setattr(run, key, value)
        
        await db.commit()
        await db.refresh(run)
    return run

# Evaluation Result CRUD
async def create_evaluation_result(db: AsyncSession, result_data: Dict[str, Any]) -> EvaluationResult:
    """Create an evaluation result"""
    db_result = EvaluationResult(**result_data)
    db.add(db_result)
    await db.commit()
    await db.refresh(db_result)
    return db_result

async def get_evaluation_results(db: AsyncSession, run_id: int) -> List[EvaluationResult]:
    """Get all results for an evaluation run"""
    result = await db.execute(
        select(EvaluationResult)
        .options(
            selectinload(EvaluationResult.prompt_config),
            selectinload(EvaluationResult.model_config)
        )
        .where(EvaluationResult.evaluation_run_id == run_id)
    )
    return result.scalars().all()

async def get_evaluation_summary(db: AsyncSession, experiment_id: int) -> Dict[str, Any]:
    """Get evaluation summary for an AI experiment"""
    # Get latest evaluation run
    run_result = await db.execute(
        select(EvaluationRun)
        .where(EvaluationRun.ai_experiment_id == experiment_id)
        .where(EvaluationRun.status == "completed")
        .order_by(EvaluationRun.completed_at.desc())
        .limit(1)
    )
    latest_run = run_result.scalar_one_or_none()
    
    if not latest_run:
        return {"status": "no_runs", "message": "No completed evaluation runs found"}
    
    # Get results for the latest run
    results = await get_evaluation_results(db, latest_run.id)
    
    # Calculate summary metrics
    if not results:
        return {"status": "no_results", "message": "No results found for the latest run"}
    
    total_results = len(results)
    avg_accuracy = sum(r.accuracy_score or 0 for r in results) / total_results
    avg_latency = sum(r.latency_ms or 0 for r in results) / total_results
    total_cost = sum(r.cost_usd or 0 for r in results)
    
    return {
        "status": "success",
        "latest_run_id": latest_run.id,
        "total_samples": total_results,
        "average_accuracy": round(avg_accuracy, 3),
        "average_latency_ms": round(avg_latency, 2),
        "total_cost_usd": round(total_cost, 4),
        "run_completed_at": latest_run.completed_at.isoformat() if latest_run.completed_at else None
    }