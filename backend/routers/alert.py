import httpx
from fastapi import APIRouter, HTTPException

from core.config import settings
from schemas import RedFlagRequest, RedFlagResponse

router = APIRouter(prefix="/alert", tags=["alert"])


@router.post("/redflag", response_model=RedFlagResponse)
async def post_redflag(body: RedFlagRequest):
    if not settings.SLACK_WEBHOOK_URL:
        raise HTTPException(status_code=503, detail="Slack webhook not configured")

    message = {
        "text": (
            f":rotating_light: *RED FLAG 감지*\n"
            f"*학생 ID*: {body.user_id}\n"
            f"*심각도*: {body.severity}\n"
            f"*사유*: {body.reason}"
        )
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(settings.SLACK_WEBHOOK_URL, json=message, timeout=5.0)

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Slack notification failed")

    return RedFlagResponse(status="sent")
