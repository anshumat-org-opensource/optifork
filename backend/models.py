from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from db import Base

class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    rollout = Column(Float)
    rules = relationship("Rule", back_populates="flag", cascade="all, delete-orphan")

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    field = Column(String)
    op = Column(String)
    value = Column(String)

    flag_id = Column(Integer, ForeignKey("feature_flags.id"))
    flag = relationship("FeatureFlag", back_populates="rules")

class FlagExposure(Base):
    __tablename__ = "flag_exposures"

    id = Column(Integer, primary_key=True, index=True)
    flag_id = Column(Integer, ForeignKey("feature_flags.id"))
    flag_name = Column(String, index=True)
    user_id = Column(String, index=True)
    enabled = Column(String)  # "true" or "false"
    timestamp = Column(DateTime, server_default=func.now())
    
    flag = relationship("FeatureFlag")
