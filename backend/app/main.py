from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.routers import upload, explain, auth_router, patients, requests

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PANORAMA PDAC Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(requests.router, prefix="/api/requests", tags=["requests"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(explain.router, prefix="/api/explain", tags=["explain"])

@app.get("/health")
def health():
    return {"status": "ok"}