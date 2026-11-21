import os
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from common_data import (
    admin_learn_collection,
    programs_collection,
    batches_collection
)

router = APIRouter(prefix="/admin/learn", tags=["Admin Learning Materials"])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "singodiya_admin_123")


def verify_admin(
    x_admin_key: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None)
):
    token = x_admin_key
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if token != ADMIN_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin credentials."
        )
    return True


class LearnMaterialPayload(BaseModel):
    title: str
    description: Optional[str] = ""
    content: Optional[str] = ""
    resource_url: Optional[str] = ""
    program_id: Optional[str] = None
    batch_id: Optional[str] = None
    material_type: Optional[str] = "Notes"
    status: Optional[str] = "active"


def serialize_material(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", "Untitled Material"),
        "description": doc.get("description", ""),
        "content": doc.get("content", ""),
        "resource_url": doc.get("resource_url", ""),
        "program_id": doc.get("program_id") or "",
        "batch_id": doc.get("batch_id") or "",
        "material_type": doc.get("material_type", "Notes"),
        "status": str(doc.get("status", "active")).lower(),
        "created_at": doc.get("created_at", "")
    }


def validate_program_and_batch(program_id: Optional[str], batch_id: Optional[str]):
    if program_id:
        if not ObjectId.is_valid(program_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid program ID."
            )
        if not programs_collection.find_one({"_id": ObjectId(program_id)}):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected program not found."
            )

    if batch_id:
        if not ObjectId.is_valid(batch_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid batch ID."
            )
        if not batches_collection.find_one({"_id": ObjectId(batch_id)}):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected batch not found."
            )


@router.get("", dependencies=[Depends(verify_admin)])
async def list_materials():
    cursor = admin_learn_collection.find().sort("created_at", -1)
    materials = [serialize_material(doc) for doc in cursor]
    return {"total": len(materials), "materials": materials}


@router.post("", dependencies=[Depends(verify_admin)])
async def create_material(payload: LearnMaterialPayload):
    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material title is required."
        )

    validate_program_and_batch(payload.program_id, payload.batch_id)

    doc = {
        "title": title,
        "description": (payload.description or "").strip(),
        "content": (payload.content or "").strip(),
        "resource_url": (payload.resource_url or "").strip(),
        "program_id": payload.program_id or None,
        "batch_id": payload.batch_id or None,
        "material_type": (payload.material_type or "Notes").strip(),
        "status": (payload.status or "active").lower(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = admin_learn_collection.insert_one(doc)
    return {
        "message": "Learning material created successfully.",
        "id": str(result.inserted_id)
    }


@router.put("/{material_id}", dependencies=[Depends(verify_admin)])
async def update_material(material_id: str, payload: LearnMaterialPayload):
    if not ObjectId.is_valid(material_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material ID."
        )

    title = payload.title.strip()
    if not title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Material title is required."
        )

    validate_program_and_batch(payload.program_id, payload.batch_id)

    update_data = {
        "title": title,
        "description": (payload.description or "").strip(),
        "content": (payload.content or "").strip(),
        "resource_url": (payload.resource_url or "").strip(),
        "program_id": payload.program_id or None,
        "batch_id": payload.batch_id or None,
        "material_type": (payload.material_type or "Notes").strip(),
        "status": (payload.status or "active").lower(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    result = admin_learn_collection.update_one(
        {"_id": ObjectId(material_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning material not found."
        )

    return {"message": "Learning material updated successfully."}


@router.delete("/{material_id}", dependencies=[Depends(verify_admin)])
async def delete_material(material_id: str):
    if not ObjectId.is_valid(material_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid material ID."
        )

    result = admin_learn_collection.delete_one({"_id": ObjectId(material_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning material not found."
        )

    return {"message": "Learning material deleted successfully."}
