from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, JSON, Integer
from backend.app.db.database import Base

class User(Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(Integer, primary_key = True, index = True)
    login: Mapped[str] = mapped_column(String, index = True, nullable = False)
    password: Mapped[str] = mapped_column(String, index = True, nullable = False)
    keys : Mapped[JSON] = mapped_column(JSON, index = True, nullable = False) # dict {"key_name": "key"}

    def __repr__(self) -> str:
        return f"User(login='{self.login}', id='{self.id}')"