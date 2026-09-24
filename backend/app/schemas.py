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

class CTSlicesInfo(BaseModel):
    base_path: str
    n_slices: int
    mid_slice: int

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
    gradcam_path: str | None = None
    segmentation_path: str | None = None
    ct_slices: CTSlicesInfo | None = None
    shapValues: List[ShapValue] | None = None
    confidence_label: str | None = None
    threshold: float | None = None