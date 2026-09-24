from fastapi import FastAPI
from sqlalchemy import inspect, text
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import upload, explain, auth_router, patients, requests, notifications, radiologists
from fastapi.staticfiles import StaticFiles
import os
from fastapi.staticfiles import StaticFiles

Base.metadata.create_all(bind=engine)

# Keep existing installations compatible with the request-owned prescription field.
with engine.begin() as connection:
    columns = {column["name"] for column in inspect(engine).get_columns("case_requests")}
    if "prescription" not in columns:
        connection.execute(text("ALTER TABLE case_requests ADD COLUMN prescription TEXT NULL"))

app = FastAPI(title="PANORAMA PDAC Detection API")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(os.path.join(STATIC_DIR, "gradcam"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(explain.router, prefix="/api/explain", tags=["explain"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(radiologists.router, prefix="/api/radiologists", tags=["radiologists"])

@app.get("/health")
def health():
    return {"status": "ok"}