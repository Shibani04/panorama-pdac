from pydantic import BaseModel
from typing import List

class CaseSummary(BaseModel):
    id: str
    scanner: str
    group: str
    prediction: float
    flagged: bool
    date: str

class ShapValue(BaseModel):
    feature: str
    value: float

class CaseDetail(BaseModel):
    id: str
    scanner: str
    group: str
    prediction: float
    age: float
    sex: str
    totalSlices: int
    midSlice: int
    shapValues: List[ShapValue]