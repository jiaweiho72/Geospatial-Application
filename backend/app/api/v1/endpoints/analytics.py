# analytics.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import SessionLocal
from typing import List, Optional
from app import services, schemas
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------- Schemas --------------------------------
class ObstructionTimeSeriesItem(BaseModel):
    date: datetime
    obstruction_count: int

# -------------------------------- Obstruction Timeseries --------------------------------
# Currently the time is the 'created_at' date - consider a more accurate representation
@router.get("/obstruction-timeseries", response_model=List[ObstructionTimeSeriesItem])
def get_obstruction_timeseries_data(
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering the data."),
    end_date: Optional[datetime] = Query(None, description="End date for filtering the data."),
    group_by: str = Query('day', enum=['day', 'week', 'month', 'year'], description="Group data by day, week, month, or year.")
):
    return services.get_obstruction_timeseries(db, start_date=start_date, end_date=end_date, group_by=group_by)

# -------------------------------- Metrics --------------------------------
@router.get("/metrics", response_model=schemas.MetricsResponse)
def get_metrics_data(db: Session = Depends(get_db)) -> schemas.MetricsResponse:
    """
    Endpoint to get analytics data.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        MetricsResponse: Dictionary with the analytics data.
    """
    analytics_data = services.get_metrics_as_dict(db)
    return analytics_data

# -------------------------------- HeatMap --------------------------------
@router.get("/heat-map", response_model=List[schemas.HeatMapResponse])
def get_heat_map_data(db: Session = Depends(get_db)) -> List[schemas.HeatMapResponse]:
    """
    Endpoint to get analytics data.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        MetricsResponse: Dictionary with the analytics data.
    """
    analytics_data = services.get_heat_map_data(db)
    return analytics_data