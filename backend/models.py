from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean, JSON, func
from sqlalchemy.orm import relationship
from db import Base

class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    rollout = Column(Float)
    rules = relationship("Rule", back_populates="flag", cascade="all, delete-orphan")
    flag_segments = relationship("FlagSegment", back_populates="flag", cascade="all, delete-orphan")

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    field = Column(String)
    op = Column(String)
    value = Column(String)

    flag_id = Column(Integer, ForeignKey("feature_flags.id"))
    flag = relationship("FeatureFlag", back_populates="rules")

class UserSegment(Base):
    __tablename__ = "user_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    conditions = Column(JSON)  # Array of condition objects
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    flag_segments = relationship("FlagSegment", back_populates="segment", cascade="all, delete-orphan")

class FlagSegment(Base):
    __tablename__ = "flag_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    flag_id = Column(Integer, ForeignKey("feature_flags.id"))
    segment_id = Column(Integer, ForeignKey("user_segments.id"))
    enabled = Column(Boolean, default=True)
    rollout_percentage = Column(Float, default=100.0)  # Override rollout for this segment
    priority = Column(Integer, default=0)  # Higher priority segments evaluated first
    
    # Relationships
    flag = relationship("FeatureFlag", back_populates="flag_segments")
    segment = relationship("UserSegment", back_populates="flag_segments")

class RemoteConfig(Base):
    __tablename__ = "remote_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    description = Column(String)
    value_type = Column(String)  # "string", "number", "boolean", "json"
    default_value = Column(Text)  # Always stored as text, parsed based on value_type
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    config_segments = relationship("ConfigSegment", back_populates="config", cascade="all, delete-orphan")

class ConfigSegment(Base):
    __tablename__ = "config_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("remote_configs.id"))
    segment_id = Column(Integer, ForeignKey("user_segments.id"))
    value = Column(Text)  # Segment-specific value override
    enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority segments evaluated first
    
    # Relationships
    config = relationship("RemoteConfig", back_populates="config_segments")
    segment = relationship("UserSegment")

class FlagExposure(Base):
    __tablename__ = "flag_exposures"

    id = Column(Integer, primary_key=True, index=True)
    flag_id = Column(Integer, ForeignKey("feature_flags.id"))
    flag_name = Column(String, index=True)
    user_id = Column(String, index=True)
    enabled = Column(String)  # "true" or "false"
    segment_id = Column(Integer, ForeignKey("user_segments.id"), nullable=True)  # Track which segment matched
    timestamp = Column(DateTime, server_default=func.now())
    
    flag = relationship("FeatureFlag")
    segment = relationship("UserSegment")

class ConfigExposure(Base):
    __tablename__ = "config_exposures"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("remote_configs.id"))
    config_key = Column(String, index=True)
    user_id = Column(String, index=True)
    value = Column(Text)  # The actual value returned
    segment_id = Column(Integer, ForeignKey("user_segments.id"), nullable=True)  # Track which segment matched
    timestamp = Column(DateTime, server_default=func.now())
    
    config = relationship("RemoteConfig")
    segment = relationship("UserSegment")

class SnowflakeConfig(Base):
    __tablename__ = "snowflake_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    account = Column(String, nullable=False)
    user = Column(String, nullable=False)
    password = Column(String, nullable=False)  # Should be encrypted in production
    warehouse = Column(String, nullable=False)
    database = Column(String, nullable=False)
    schema = Column(String, nullable=False)
    is_active = Column(String, default="true")  # Only one active config
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

# AI Experiment Models
class AIExperiment(Base):
    """AI Experiment for prompt and model testing"""
    __tablename__ = "ai_experiments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    status = Column(String, default="draft")  # draft, running, completed, archived
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    prompt_configs = relationship("PromptConfig", back_populates="ai_experiment", cascade="all, delete-orphan")
    model_configs = relationship("ModelConfig", back_populates="ai_experiment", cascade="all, delete-orphan")
    evaluation_datasets = relationship("EvaluationDataset", back_populates="ai_experiment", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="ai_experiment", cascade="all, delete-orphan")

class PromptConfig(Base):
    """Prompt configuration and versions"""
    __tablename__ = "prompt_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    ai_experiment_id = Column(Integer, ForeignKey("ai_experiments.id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, default="1.0")
    prompt_template = Column(Text, nullable=False)
    system_message = Column(Text)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1000)
    stop_sequences = Column(JSON)  # Array of stop sequences
    variables = Column(JSON)  # Variables used in template
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ai_experiment = relationship("AIExperiment", back_populates="prompt_configs")
    evaluation_results = relationship("EvaluationResult", back_populates="prompt_config")

class ModelConfig(Base):
    """Model configuration for AI experiments"""
    __tablename__ = "model_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    ai_experiment_id = Column(Integer, ForeignKey("ai_experiments.id"), nullable=False)
    name = Column(String, nullable=False)
    provider = Column(String, nullable=False)  # openai, anthropic, google, etc.
    model_name = Column(String, nullable=False)  # gpt-4, claude-3-sonnet, etc.
    api_key_name = Column(String)  # Reference to stored API key
    base_url = Column(String)  # For custom endpoints
    parameters = Column(JSON)  # Additional model parameters
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ai_experiment = relationship("AIExperiment", back_populates="model_configs")
    evaluation_results = relationship("EvaluationResult", back_populates="model_config")

class EvaluationDataset(Base):
    """Dataset for offline evaluation"""
    __tablename__ = "evaluation_datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    ai_experiment_id = Column(Integer, ForeignKey("ai_experiments.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    dataset_type = Column(String, default="json")  # json, csv, jsonl
    file_path = Column(String)  # Path to stored dataset file
    sample_count = Column(Integer, default=0)
    schema_definition = Column(JSON)  # Expected input/output schema
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ai_experiment = relationship("AIExperiment", back_populates="evaluation_datasets")
    evaluation_runs = relationship("EvaluationRun", back_populates="dataset")

class EvaluationRun(Base):
    """Record of an offline evaluation run"""
    __tablename__ = "evaluation_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    ai_experiment_id = Column(Integer, ForeignKey("ai_experiments.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("evaluation_datasets.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, running, completed, failed
    total_samples = Column(Integer, default=0)
    completed_samples = Column(Integer, default=0)
    average_latency = Column(Float)
    total_cost = Column(Float)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    ai_experiment = relationship("AIExperiment", back_populates="evaluation_runs")
    dataset = relationship("EvaluationDataset", back_populates="evaluation_runs")
    results = relationship("EvaluationResult", back_populates="evaluation_run", cascade="all, delete-orphan")

class EvaluationResult(Base):
    """Individual evaluation result for prompt + model combination"""
    __tablename__ = "evaluation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    evaluation_run_id = Column(Integer, ForeignKey("evaluation_runs.id"), nullable=False)
    prompt_config_id = Column(Integer, ForeignKey("prompt_configs.id"), nullable=False)
    model_config_id = Column(Integer, ForeignKey("model_configs.id"), nullable=False)
    sample_input = Column(JSON)  # Input data from dataset
    model_output = Column(Text)  # Raw model response
    expected_output = Column(Text)  # Expected/ground truth output
    latency_ms = Column(Integer)
    token_count = Column(Integer)
    cost_usd = Column(Float)
    
    # Evaluation Metrics
    accuracy_score = Column(Float)
    bleu_score = Column(Float)
    rouge_score = Column(JSON)  # ROUGE-1, ROUGE-2, ROUGE-L
    semantic_similarity = Column(Float)
    custom_metrics = Column(JSON)  # User-defined metrics
    
    # Additional context (renamed from metadata to avoid SQLAlchemy conflict)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    result_metadata = Column(JSON)  # Additional context
    
    # Relationships
    evaluation_run = relationship("EvaluationRun", back_populates="results")
    prompt_config = relationship("PromptConfig", back_populates="evaluation_results")
    model_config = relationship("ModelConfig", back_populates="evaluation_results")

class EvaluationMetric(Base):
    """Custom evaluation metrics definition"""
    __tablename__ = "evaluation_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    metric_type = Column(String, nullable=False)  # accuracy, similarity, custom
    calculation_method = Column(String)  # exact_match, cosine_similarity, custom_function
    parameters = Column(JSON)  # Metric-specific parameters
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
