from sqlalchemy.orm import Session
from app import models, schemas
from shapely.geometry import Polygon
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, box
from sqlalchemy import asc
from sqlalchemy.sql import func

# -------------------------------- CRUD --------------------------------
def create_polygon(db: Session, polygon: schemas.PolygonCreate):
    shapely_polygon = Polygon(polygon.coordinates)
    if not shapely_polygon.is_valid:
        raise ValueError("Invalid polygon coordinates")

    geoalchemy_polygon = from_shape(shapely_polygon, srid=4326)

    db_polygon = models.Polygon(
        name=polygon.name,
        address=polygon.address,
        type=polygon.type,
        coordinates=geoalchemy_polygon
    )
    db.add(db_polygon)
    db.commit()
    db.refresh(db_polygon)

    # Convert the GeoAlchemy2 geometry back to a list of coordinates for the response
    shape = to_shape(db_polygon.coordinates)
    coordinates = mapping(shape)["coordinates"][0]

    return schemas.Polygon(
        id=db_polygon.id,
        name=db_polygon.name,
        address=db_polygon.address,
        type=db_polygon.type,
        coordinates=coordinates,
        latest_status=db_polygon.latest_status,
    )

def get_polygons(db: Session, skip: int = 0, limit: int = None):
    query = db.query(models.Polygon).order_by(asc(models.Polygon.id)).offset(skip)
    if limit is not None:
        query = query.limit(limit)
    polygons = query.all()
    
    return [
        schemas.Polygon(
            id=poly.id,
            name=poly.name,
            address=poly.address,
            type=poly.type,
            coordinates=mapping(to_shape(poly.coordinates))["coordinates"][0],
            latest_status=poly.latest_status,
        )
        for poly in polygons
    ]


def update_polygon(db: Session, polygon_id: int, polygon: schemas.PolygonUpdate):
    db_polygon = db.query(models.Polygon).filter(models.Polygon.id == polygon_id).first()

    if db_polygon is None:
        raise ValueError("Polygon not found")

    shapely_polygon = Polygon(polygon.coordinates)
    if not shapely_polygon.is_valid:
        raise ValueError("Invalid polygon coordinates")

    geoalchemy_polygon = from_shape(shapely_polygon, srid=4326)

    db_polygon.name = polygon.name
    db_polygon.address = polygon.address
    db_polygon.type = polygon.type
    db_polygon.coordinates = geoalchemy_polygon

    db.commit()
    db.refresh(db_polygon)

    shape = to_shape(db_polygon.coordinates)
    coordinates = mapping(shape)["coordinates"][0]

    return schemas.Polygon(
        id=db_polygon.id,
        name=db_polygon.name,
        address=db_polygon.address,
        type=db_polygon.type,
        coordinates=coordinates,
        latest_status=db_polygon.latest_status,
    )
    
def delete_polygon(db: Session, polygon_id: int):
    db_polygon = db.query(models.Polygon).filter(models.Polygon.id == polygon_id).first()
    if not db_polygon:
        raise ValueError("Polygon not found")

    shape = to_shape(db_polygon.coordinates)
    coordinates = list(shape.exterior.coords)

    db.delete(db_polygon)
    db.commit()
    return schemas.Polygon(
        id=db_polygon.id,
        name=db_polygon.name,
        address=db_polygon.address,
        type=db_polygon.type,
        coordinates=coordinates,
        latest_status=db_polygon.latest_status,
    )