from fastapi import APIRouter


router = APIRouter()


@router.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"message": "MPLADS Sentinel AI API is running"}


@router.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "healthy"}