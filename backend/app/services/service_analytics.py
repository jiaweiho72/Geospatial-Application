# services/analytics_service.py
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, case
from app import models, schemas
from datetime import datetime
import json
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, box

# --------------------------- Obstruction Time Series ---------------------------
def get_obstruction_timeseries(db: Session, start_date: datetime = None, end_date: datetime = None, group_by: str = 'day'):
    date_trunc_format = {
        'day': 'day',
        'week': 'week',
        'month': 'month',
        'year': 'year'
    }.get(group_by, 'day')

    query = db.query(
        func.date_trunc(date_trunc_format, models.CroppedImage.created_at).label('date'),
        func.count(models.CroppedImage.id).label('obstruction_count')
    ).filter(
        models.CroppedImage.data['obstruction_present'].as_boolean() == True
    )

    if start_date:
        query = query.filter(models.CroppedImage.created_at >= start_date)
    if end_date:
        query = query.filter(models.CroppedImage.created_at <= end_date)

    query = query.group_by(func.date_trunc(date_trunc_format, models.CroppedImage.created_at)).order_by(
        func.date_trunc(date_trunc_format, models.CroppedImage.created_at)
    )

    results = query.all()

    return [{"date": result.date, "obstruction_count": result.obstruction_count} for result in results]

# --------------------------- Heat Map Data ---------------------------

def get_heat_map_data(db: Session, start_date: datetime = None, end_date: datetime = None):
    CroppedImageAlias = aliased(models.CroppedImage)
    query = (
        db.query(
            models.Polygon.id.label('id'),
            models.Polygon.name.label('name'),
            models.Polygon.coordinates.label('coordinates'),
            func.count(
                case(
                    (CroppedImageAlias.data['obstruction_present'].astext == 'true', 1), 
                    else_=None
                )
            ).label('obstruction_count')
        )
        .select_from(models.Polygon)
        .outerjoin(CroppedImageAlias, CroppedImageAlias.polygon_id == models.Polygon.id)
        .group_by(models.Polygon.id)
    )
    results = query.all()

    return [schemas.HeatMapResponse(
            id=result.id,
            name=result.name,
            coordinates=[[lat, long] for long, lat in mapping(to_shape(result.coordinates))["coordinates"][0]],
            obstruction_count=result.obstruction_count,
        )
        for result in results
    ]

# --------------------------- 
# Key Metrics 
# ---------------------------

# --------------------------- Polygons ---------------------------
def get_polygon_counts_by_status(db: Session):
    """
    Get the number of polygons for each group in 'latest_status'.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        dict: A dictionary with status as keys and counts as values.
    """
    # Query to get counts of polygons by 'latest_status'
    status_counts = db.query(models.Polygon.latest_status, func.count(models.Polygon.id)) \
        .group_by(models.Polygon.latest_status) \
        .all()
    
    # Convert query result to dictionary
    result = {status: count for status, count in status_counts}
    return result

def get_total_polygon_count(db: Session):
    """
    Get the total number of polygons.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        int: The total count of polygons.
    """
    # Query to get the total count of polygons
    total_count = db.query(func.count(models.Polygon.id)).scalar()
    return total_count

from app.schemas import MetricsResponse  # Assuming the MetricsResponse model is in app/schemas

def get_metrics_as_dict(db: Session) -> MetricsResponse:
    """
    Get analytics data as a MetricsResponse object, including:
    - Polygon counts by status
    - Total polygon count
    - Total image count
    - Total cropped images count, count where 'is_vehicle' is true, and count where 'is_flammable' is true.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        MetricsResponse: A Pydantic model containing the analytics data.
    """
    # Get the counts by polygon status
    status_counts = get_polygon_counts_by_status(db)
    
    # Get the total polygon count
    total_polygon_count = get_total_polygon_count(db)
    
    # Get the total image count
    total_image_count = get_total_image_count(db)
    
    # Get the cropped image counts (total, is_vehicle, is_flammable)
    cropped_image_counts = get_cropped_image_counts(db)
    
    # Construct the MetricsResponse object
    metrics_response = MetricsResponse(
        status_counts=status_counts,
        total_polygon_count=total_polygon_count,
        total_image_count=total_image_count,
        total_cropped_images=cropped_image_counts['total_cropped_images'],
        is_vehicle_count=cropped_image_counts['is_vehicle_count'],
        is_flammable_count=cropped_image_counts['is_flammable_count']
    )
    
    return metrics_response




# --------------------------- No of Images ---------------------------
def get_total_image_count(db: Session) -> int:
    """
    Get the total number of images.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        int: The total count of images.
    """
    total_count = db.query(func.count(models.Image.id)).scalar()
    return total_count

# --------------------------- No of Cropped Images ---------------------------
def get_cropped_image_counts(db: Session) -> dict:
    """
    Get the total count of cropped images, as well as the counts where 'is_vehicle' is true and 'is_flammable' is true.
    
    Args:
        db (Session): The SQLAlchemy database session.
        
    Returns:
        dict: Dictionary with total cropped images count, count where 'is_vehicle' is true, and count where 'is_flammable' is true.
    """
    # Query to get total count, count where is_vehicle is true, and count where is_flammable is true
    total_count = db.query(func.count(models.CroppedImage.id)).scalar()
    
    is_vehicle_count = db.query(func.count(models.CroppedImage.id)).filter(
        models.CroppedImage.data['is_vehicle'].as_boolean() == True
    ).scalar()
    
    is_flammable_count = db.query(func.count(models.CroppedImage.id)).filter(
        models.CroppedImage.data['is_flammable'].as_boolean() == True
    ).scalar()

    return {
        "total_cropped_images": total_count,
        "is_vehicle_count": is_vehicle_count,
        "is_flammable_count": is_flammable_count
    }
