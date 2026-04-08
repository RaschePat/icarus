from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import UserProfile
from schemas import UserProfileResponse, CumulativeAptitude

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    row = await db.get(UserProfile, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="user not found")
    return UserProfileResponse(
        user_id=row.user_id,
        cumulative_aptitude=CumulativeAptitude(
            logic_avg=row.logic_avg,
            planning_avg=row.planning_avg,
            ux_avg=row.ux_avg,
            data_avg=row.data_avg,
        ),
        session_count=row.session_count,
        career_identity=row.career_identity,
        last_updated=row.last_updated,
    )
