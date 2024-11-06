from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from fastapi.responses import StreamingResponse
import pandas as pd
import io
from app import crud, schemas
from app.db import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------- Get Polygons --------------------------------
@router.get("/", response_model=List[schemas.Polygon])
def get_polygons(skip: int = 0, limit: int = None, db: Session = Depends(get_db)):
    return crud.get_polygons(db=db, skip=skip, limit=limit)

# -------------------------------- Create Polygon --------------------------------
@router.post("/", response_model=schemas.Polygon)
def create_polygon(polygon: schemas.PolygonCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_polygon(db=db, polygon=polygon)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------- Update Polygons by id --------------------------------
@router.put("/{polygon_id}", response_model=schemas.Polygon)
def update_polygon(polygon_id: int, polygon: schemas.PolygonUpdate, db: Session = Depends(get_db)):
    try:
        return crud.update_polygon(db=db, polygon_id=polygon_id, polygon=polygon)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------- Delete Polygon by id --------------------------------
@router.delete("/{polygon_id}", response_model=schemas.Polygon)
def delete_polygon(polygon_id: int, db: Session = Depends(get_db)):
    try:
        return crud.delete_polygon(db=db, polygon_id=polygon_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# -------------------------------- Download Polygons CSV --------------------------------
@router.get("/download-csv")
def download_csv(skip: int = 0, limit: int = None, db: Session = Depends(get_db)):
    polygons = crud.get_polygons(db=db, skip=skip, limit=limit)
    
    if not polygons:
        raise HTTPException(status_code=404, detail="No polygons found")

    # Convert the polygons to a list of dictionaries
    polygons_dict = [
        {
            "id": poly.id,
            "name": poly.name,
            "address": poly.address,
            "type": poly.type,
            "coordinates": poly.coordinates  # Ensure this is a serializable format
        }
        for poly in polygons
    ]
    
    # Convert the list of dictionaries to a DataFrame
    df = pd.DataFrame(polygons_dict)
    
    # Convert DataFrame to CSV
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    # Stream the CSV back as a response
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = "attachment; filename=polygons.csv"
    return response
    
