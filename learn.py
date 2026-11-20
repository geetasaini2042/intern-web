import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId

from common_data import (
    get_current_intern,
    learn_modules_collection,
    interns_collection
)

router = APIRouter(prefix="/intern/learn", tags=["Intern Learning"])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "singodiya_admin_123")


def verify_admin(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin key."
        )
    return True


# --- Pydantic Models ---
class LessonInput(BaseModel):
    id: Optional[str] = None
    title: str
    type: str = "reading"           # reading, video, pdf, quiz
    duration: Optional[str] = "15 min"
    url: Optional[str] = None
    content: Optional[str] = None
    completed: bool = False


class AssignmentInput(BaseModel):
    title: str
    description: Optional[str] = ""
    url: Optional[str] = None


class AssignModuleRequest(BaseModel):
    intern_email: str
    title: str
    description: str = ""
    order: int = 1
    category: str = "Learning"
    duration: str = "1 hour"
    status: str = "available"       # available, in_progress, completed, locked
    thumbnail: str = ""
    skills: List[str] = []
    lessons: List[LessonInput] = []
    assignment: Optional[AssignmentInput] = None


class LessonProgressRequest(BaseModel):
    module_id: str
    lesson_id: str
    status: str = "completed"


def serialize_module(doc: dict) -> dict:
    lessons = doc.get("lessons", [])
    total = len(lessons)
    completed_count = sum(
        1 for l in lessons
        if l.get("completed") is True or l.get("status") == "completed"
    )
    progress = round((completed_count / total) * 100) if total > 0 else int(doc.get("progress", 0))

    mod_status = doc.get("status", "available")
    if mod_status != "locked":
        if total > 0 and completed_count == total:
            mod_status = "completed"
        elif completed_count > 0:
            mod_status = "in_progress"

    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", "Untitled Module"),
        "description": doc.get("description", ""),
        "order": int(doc.get("order", 1)),
        "category": doc.get("category", "Learning"),
        "duration": doc.get("duration", "Self-paced"),
        "thumbnail": doc.get("thumbnail", ""),
        "skills": doc.get("skills", []),
        "lessons": lessons,
        "total_lessons": total,
        "progress": progress,
        "status": mod_status,
        "assignment": doc.get("assignment")
    }


# --- 1. इंटर्न का लर्निंग डेटा और मॉड्यूल्स लाएँ (GET /intern/learn) ---
@router.get("")
async def get_learning_data(current_intern: dict = Depends(get_current_intern)):
    intern_id = str(current_intern["_id"])

    cursor = learn_modules_collection.find({"intern_id": intern_id}).sort("order", 1)
    modules = [serialize_module(doc) for doc in cursor]

    overall_progress = (
        round(sum(m["progress"] for m in modules) / len(modules))
        if modules else 0
    )

    student_info = {
        "name": current_intern.get("name", ""),
        "email": current_intern.get("email", ""),
        "internship_domain": current_intern.get("domain") or current_intern.get("internship_domain", "")
    }

    return {
        "student": student_info,
        "learning_path": {
            "title": f"{student_info['internship_domain'] or 'Internship'} Learning Path",
            "description": "Build practical skills, complete learning modules and prepare for your internship projects.",
            "progress": overall_progress
        },
        "modules": modules
    }


# --- 2. लेसन को Completed मार्क करें (POST /intern/learn/progress) ---
@router.post("/progress")
async def update_lesson_progress(
    payload: LessonProgressRequest,
    current_intern: dict = Depends(get_current_intern)
):
    intern_id = str(current_intern["_id"])

    if not ObjectId.is_valid(payload.module_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid module ID."
        )

    module_doc = learn_modules_collection.find_one({
        "_id": ObjectId(payload.module_id),
        "intern_id": intern_id
    })

    if not module_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found."
        )

    lessons = module_doc.get("lessons", [])
    lesson_found = False

    for lesson in lessons:
        lid = str(lesson.get("id") or lesson.get("lesson_id") or "")
        if lid == str(payload.lesson_id):
            lesson["completed"] = payload.status == "completed"
            lesson["status"] = payload.status
            lesson_found = True
            break

    if not lesson_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found in this module."
        )

    total = len(lessons)
    completed_count = sum(1 for l in lessons if l.get("completed") is True)
    progress = round((completed_count / total) * 100) if total > 0 else 0
    new_status = "completed" if total > 0 and completed_count == total else "in_progress"

    learn_modules_collection.update_one(
        {"_id": module_doc["_id"]},
        {
            "$set": {
                "lessons": lessons,
                "progress": progress,
                "status": new_status
            }
        }
    )

    return {
        "message": "Progress saved successfully.",
        "module_progress": progress,
        "module_status": new_status
    }


# --- 3. एडमिन द्वारा मॉड्यूल असाइन करें (POST /intern/learn/assign-module) ---
@router.post("/assign-module", dependencies=[Depends(verify_admin)])
async def assign_module(payload: AssignModuleRequest):
    email = payload.intern_email.strip().lower()
    intern = interns_collection.find_one({"email": email})

    if not intern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intern not found with this email."
        )

    formatted_lessons = []
    for idx, lesson in enumerate(payload.lessons, start=1):
        lesson_dict = lesson.model_dump()
        if not lesson_dict.get("id"):
            lesson_dict["id"] = f"lesson-{idx}-{uuid.uuid4().hex[:6]}"
        lesson_dict["status"] = "completed" if lesson_dict.get("completed") else "pending"
        formatted_lessons.append(lesson_dict)

    module_doc = {
        "intern_id": str(intern["_id"]),
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "order": payload.order,
        "category": payload.category,
        "duration": payload.duration,
        "status": payload.status,
        "progress": 0,
        "thumbnail": payload.thumbnail,
        "skills": payload.skills,
        "lessons": formatted_lessons,
        "assignment": payload.assignment.model_dump() if payload.assignment else None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = learn_modules_collection.insert_one(module_doc)

    return {
        "message": "Learning module assigned successfully.",
        "module_id": str(result.inserted_id)
    }
