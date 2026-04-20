from pydantic import BaseModel, Field



class DiagramGenerateRequest(BaseModel):
    structure_name: str = Field(..., min_length=1, max_length=300)


class DiagramGenerateResponse(BaseModel):
    plantuml_code: str
    image_base64: str