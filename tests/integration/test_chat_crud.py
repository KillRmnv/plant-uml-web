"""Интеграционные тесты CRUD-слоя домена chat."""
import pytest

from backend.app.domains.chat import crud
from backend.app.domains.chat.exceptions import (
    ChatAccessDeniedError,
    ChatNotFoundError,
)
from backend.app.domains.chat.models import Message
from backend.app.domains.users import services as users_services
from backend.app.domains.users.schemas import UserCreate


async def _make_user(db, login="user1"):
    return await users_services.register_new_user(
        db, UserCreate(username=login, password="testtest")
    )


@pytest.mark.asyncio
async def test_create_chat(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id, "first")
    assert chat.id is not None
    assert chat.title == "first"
    assert chat.user_id == user.id


@pytest.mark.asyncio
async def test_create_chat_default_title(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id)
    assert chat.title == "Новый анализ"


@pytest.mark.asyncio
async def test_get_or_create_chat_creates_when_no_id(db_session):
    user = await _make_user(db_session)
    chat = await crud.get_or_create_chat(db_session, user.id, None)
    assert chat.id is not None


@pytest.mark.asyncio
async def test_get_or_create_chat_returns_existing_for_owner(db_session):
    user = await _make_user(db_session)
    created = await crud.create_chat(db_session, user.id, "x")
    fetched = await crud.get_or_create_chat(db_session, user.id, created.id)
    assert fetched.id == created.id


@pytest.mark.asyncio
async def test_get_or_create_chat_access_denied_for_other_user(db_session):
    owner = await _make_user(db_session, "owner")
    intruder = await _make_user(db_session, "intruder")
    chat = await crud.create_chat(db_session, owner.id, "secret")

    with pytest.raises(ChatAccessDeniedError):
        await crud.get_or_create_chat(db_session, intruder.id, chat.id)


@pytest.mark.asyncio
async def test_get_or_create_chat_not_found(db_session):
    user = await _make_user(db_session)
    with pytest.raises(ChatNotFoundError):
        await crud.get_or_create_chat(db_session, user.id, 999_999)


@pytest.mark.asyncio
async def test_chat_history_returns_dicts_with_role_and_content(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id)

    for i, role in enumerate(["user", "assistant", "user"], start=1):
        db_session.add(Message(chat_id=chat.id, role=role, content=f"m{i}"))
    await db_session.commit()

    history = await crud.get_chat_history(db_session, chat.id, limit=10)
    assert len(history) == 3
    # Все сообщения присутствуют (порядок может зависеть от БД, если timestamp одинаков)
    assert {m["content"] for m in history} == {"m1", "m2", "m3"}
    for m in history:
        assert set(m.keys()) == {"role", "content"}
        assert m["role"] in {"user", "assistant"}


@pytest.mark.asyncio
async def test_chat_history_respects_limit(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id)
    for i in range(5):
        db_session.add(Message(chat_id=chat.id, role="user", content=f"m{i}"))
    await db_session.commit()

    history = await crud.get_chat_history(db_session, chat.id, limit=3)
    assert len(history) == 3


@pytest.mark.asyncio
async def test_update_chat_title(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id, "old")
    updated = await crud.update_chat_title(db_session, user.id, chat.id, "new title")
    assert updated.title == "new title"


@pytest.mark.asyncio
async def test_update_chat_title_other_user_denied(db_session):
    owner = await _make_user(db_session, "owner")
    other = await _make_user(db_session, "other")
    chat = await crud.create_chat(db_session, owner.id, "x")
    with pytest.raises(ChatAccessDeniedError):
        await crud.update_chat_title(db_session, other.id, chat.id, "hacked")


@pytest.mark.asyncio
async def test_delete_chat_cascades_messages(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id)
    db_session.add(Message(chat_id=chat.id, role="user", content="bye"))
    await db_session.commit()

    await crud.delete_chat(db_session, user.id, chat.id)

    history = await crud.get_chat_history(db_session, chat.id, limit=10)
    assert history == []


@pytest.mark.asyncio
async def test_list_user_chats_only_returns_own(db_session):
    a = await _make_user(db_session, "alpha")
    b = await _make_user(db_session, "betas")
    await crud.create_chat(db_session, a.id, "a1")
    await crud.create_chat(db_session, a.id, "a2")
    await crud.create_chat(db_session, b.id, "b1")

    chats_a = await crud.list_user_chats(db_session, a.id)
    chats_b = await crud.list_user_chats(db_session, b.id)
    assert {c.title for c in chats_a} == {"a1", "a2"}
    assert {c.title for c in chats_b} == {"b1"}


@pytest.mark.asyncio
async def test_get_previews_batch_truncates_to_50(db_session):
    user = await _make_user(db_session)
    chat = await crud.create_chat(db_session, user.id)
    long = "x" * 200
    db_session.add(Message(chat_id=chat.id, role="user", content=long))
    await db_session.commit()

    previews = await crud.get_previews_batch(db_session, [chat.id])
    assert len(previews[chat.id]) == 50


@pytest.mark.asyncio
async def test_get_previews_batch_empty(db_session):
    assert await crud.get_previews_batch(db_session, []) == {}
