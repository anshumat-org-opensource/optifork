# experiments/models.py

from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, func
from sqlalchemy.orm import relationship
from db import Base

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    status = Column(String, default="active")  # active, paused, completed

    flag_id = Column(Integer, ForeignKey("feature_flags.id"))  # 🔁 Linked to FeatureFlag

    variants = relationship("Variant", back_populates="experiment")


class Variant(Base):
    __tablename__ = "variants"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    name = Column(String, nullable=False)
    traffic_split = Column(Float, nullable=False)  # value between 0 and 1

    experiment = relationship("Experiment", back_populates="variants")
    assignments = relationship("UserAssignment", back_populates="variant")


class UserAssignment(Base):
    __tablename__ = "user_assignments"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    variant_id = Column(Integer, ForeignKey("variants.id"))
    user_id = Column(String, index=True)

    variant = relationship("Variant", back_populates="assignments")


class ExposureLog(Base):
    __tablename__ = "exposures"

    id = Column(Integer, primary_key=True, index=True)
    experiment_id = Column(Integer, ForeignKey("experiments.id"))
    variant_id = Column(Integer, ForeignKey("variants.id"))
    user_id = Column(String, index=True)
    timestamp = Column(DateTime, server_default=func.now())
