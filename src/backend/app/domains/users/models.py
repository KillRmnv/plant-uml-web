from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from backend.app.db.database import Base


class User(Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    login: Mapped[str] = mapped_column(String, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String, index=True, nullable=False)

    settings: Mapped["UserSettings"] = relationship(
        "UserSettings", back_populates="user", uselist=False
    )

    def __repr__(self) -> str:
        return f"User(login='{self.login}', id='{self.id}')"


class UserSettings(Base):
    __tablename__ = "user_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    provider: Mapped[str | None] = mapped_column(String, nullable=True)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    auto_save: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    api_keys: Mapped[dict] = mapped_column(
        JSONB, default=dict, nullable=False
    )  # {"openai": "sk-...", "anthropic": "...", "mistral": "..."}

    user: Mapped["User"] = relationship("User", back_populates="settings")
