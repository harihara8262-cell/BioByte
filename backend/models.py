from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class PlantBase(BaseModel):
    name: str
    watering_days: int
    light: str
    humidity: str
    temperature: str
    fertilizer: str

class Plant(PlantBase):
    id: int

    class Config:
        from_attributes = True

class UserPlantBase(BaseModel):
    plant_id: int
    custom_name: str
    health_status: str
    last_watered: str
    last_fertilized: str
    notes: Optional[str] = None
    image_url: Optional[str] = None

class UserPlantCreate(UserPlantBase):
    pass

class UserPlantUpdate(BaseModel):
    custom_name: Optional[str] = None
    health_status: Optional[str] = None
    last_watered: Optional[str] = None
    last_fertilized: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None

class UserPlant(UserPlantBase):
    id: int
    added_at: str
    plant: Optional[Plant] = None

    class Config:
        from_attributes = True

class CareLogBase(BaseModel):
    user_plant_id: int
    action_type: str
    timestamp: str
    notes: Optional[str] = None

class CareLog(CareLogBase):
    id: int

    class Config:
        from_attributes = True

class PlantQuestionBase(BaseModel):
    plant_name: str
    question: str
    answer: str

class PlantQuestion(PlantQuestionBase):
    id: int

    class Config:
        from_attributes = True

# Custom response schemas
class DetectionBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int

class DetectionResult(BaseModel):
    plant_name: str
    confidence: float
    box: DetectionBox

class DetectResponse(BaseModel):
    success: bool
    detections: List[DetectionResult]
    recommended_questions: List[PlantQuestion]
    image_url: str

class AnalyticsWateringFreq(BaseModel):
    name: str
    days: int

class AnalyticsHealthStatus(BaseModel):
    status: str
    count: int

class AnalyticsWeeklyActivity(BaseModel):
    day: str
    waterings: int
    fertilizations: int

class AnalyticsUpcomingTask(BaseModel):
    id: int
    plantName: str
    taskType: str
    dueDate: str
    daysRemaining: int

class AnalyticsResponse(BaseModel):
    wateringFrequency: List[AnalyticsWateringFreq]
    healthStatus: List[AnalyticsHealthStatus]
    weeklyActivity: List[AnalyticsWeeklyActivity]
    upcomingTasks: List[AnalyticsUpcomingTask]
