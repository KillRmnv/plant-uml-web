from pydantic import BaseModel, Field



class DiagramGenerateRequest(BaseModel):
    structure_name: str = Field(..., min_length=1, max_length=300)


class DiagramGenerateResponse(BaseModel):
    plantuml_code: str
    image_base64: str
    

class DiagramFromInputsRequest(BaseModel):
    """Запрос на генерацию диаграммы из двух строк."""
    structure_name: str = Field(..., description="Structure name that contains the diagram")
    scs_code: str = Field(..., description="ScS code of diagram")
    
    class Config:
        json_schema_extra = {
            "example": {
                "structure_name": "Use_Case_Diagram",
                "scs_code": "Use_Case_Diagram -> ..."
            }
        }


