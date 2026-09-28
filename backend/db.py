import os
from typing import Annotated, Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def _coerce_object_id(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    return value


PyObjectId = Annotated[str, BeforeValidator(_coerce_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        if not doc:
            return None
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=False)
        if data.get("_id") is None:
            data.pop("_id", None)
        else:
            data["_id"] = ObjectId(data["_id"])
        return data
