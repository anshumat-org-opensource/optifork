# ai_experiments/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# AI Experiment Schemas
class AIExperimentBase(BaseModel):
    name: str = Field(..., description="Unique name for the AI experiment")
    description: Optional[str] = Field(None, description="Description of the experiment")

class AIExperimentCreate(AIExperimentBase):
    pass

class AIExperimentUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None

class AIExperimentOut(AIExperimentBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class AIExperimentDetail(AIExperimentOut):
    prompt_configs: List['PromptConfigOut'] = []
    model_configs: List['ModelConfigOut'] = []
    evaluation_datasets: List['EvaluationDatasetOut'] = []
    evaluation_runs: List['EvaluationRunOut'] = []

# Prompt Config Schemas
class PromptConfigBase(BaseModel):
    name: str = Field(..., description="Name for this prompt configuration")
    version: str = Field(default="1.0", description="Version of the prompt")
    prompt_template: str = Field(..., description="The prompt template with variables")
    system_message: Optional[str] = Field(None, description="System message for the model")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Model temperature")
    max_tokens: int = Field(default=1000, gt=0, description="Maximum tokens to generate")
    stop_sequences: Optional[List[str]] = Field(None, description="Stop sequences")
    variables: Optional[Dict[str, Any]] = Field(None, description="Variables used in template")

class PromptConfigCreate(PromptConfigBase):
    pass

class PromptConfigOut(PromptConfigBase):
    id: int
    ai_experiment_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Model Config Schemas
class ModelConfigBase(BaseModel):
    name: str = Field(..., description="Name for this model configuration")
    provider: str = Field(..., description="Model provider (openai, anthropic, etc.)")
    model_name: str = Field(..., description="Specific model name")
    api_key_name: Optional[str] = Field(None, description="Reference to API key")
    base_url: Optional[str] = Field(None, description="Custom API endpoint")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Additional model parameters")

class ModelConfigCreate(ModelConfigBase):
    pass

class ModelConfigOut(ModelConfigBase):
    id: int
    ai_experiment_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Evaluation Dataset Schemas
class EvaluationDatasetBase(BaseModel):
    name: str = Field(..., description="Name for this dataset")
    description: Optional[str] = Field(None, description="Description of the dataset")
    dataset_type: str = Field(default="json", description="Dataset format")
    sample_count: int = Field(default=0, description="Number of samples")
    schema_definition: Optional[Dict[str, Any]] = Field(None, description="Expected schema")

class EvaluationDatasetCreate(EvaluationDatasetBase):
    file_path: Optional[str] = None

class EvaluationDatasetOut(EvaluationDatasetBase):
    id: int
    ai_experiment_id: int
    file_path: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Evaluation Run Schemas
class EvaluationRunBase(BaseModel):
    name: str = Field(..., description="Name for this evaluation run")

class EvaluationRunCreate(EvaluationRunBase):
    ai_experiment_id: int
    dataset_id: int
    total_samples: int = 0

class EvaluationRunOut(EvaluationRunBase):
    id: int
    ai_experiment_id: int
    dataset_id: int
    status: str
    total_samples: int
    completed_samples: int
    average_latency: Optional[float]
    total_cost: Optional[float]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class EvaluationRunDetail(EvaluationRunOut):
    dataset: EvaluationDatasetOut
    results: List['EvaluationResultOut'] = []

# Evaluation Result Schemas
class EvaluationResultBase(BaseModel):
    sample_input: Dict[str, Any]
    model_output: str
    expected_output: Optional[str] = None
    latency_ms: Optional[int] = None
    token_count: Optional[int] = None
    cost_usd: Optional[float] = None
    accuracy_score: Optional[float] = None
    bleu_score: Optional[float] = None
    rouge_score: Optional[Dict[str, float]] = None
    semantic_similarity: Optional[float] = None
    custom_metrics: Optional[Dict[str, Any]] = None
    result_metadata: Optional[Dict[str, Any]] = None

class EvaluationResultCreate(EvaluationResultBase):
    evaluation_run_id: int
    prompt_config_id: int
    model_config_id: int

class EvaluationResultOut(EvaluationResultBase):
    id: int
    evaluation_run_id: int
    prompt_config_id: int
    model_config_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

# Evaluation Summary Schema
class EvaluationSummary(BaseModel):
    status: str
    message: Optional[str] = None
    latest_run_id: Optional[int] = None
    total_samples: Optional[int] = None
    average_accuracy: Optional[float] = None
    average_latency_ms: Optional[float] = None
    total_cost_usd: Optional[float] = None
    run_completed_at: Optional[str] = None

# Offline Evaluation Request Schema
class OfflineEvaluationRequest(BaseModel):
    experiment_id: int
    dataset_id: int
    prompt_config_ids: List[int] = Field(..., description="Prompt configs to evaluate")
    model_config_ids: List[int] = Field(..., description="Model configs to evaluate")
    evaluation_name: str = Field(..., description="Name for this evaluation run")
    sample_limit: Optional[int] = Field(None, description="Limit number of samples to evaluate")

# Update forward references
AIExperimentDetail.model_rebuild()
EvaluationRunDetail.model_rebuild()