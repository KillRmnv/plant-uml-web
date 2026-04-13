# -*- coding: utf-8 -*-
import logging
from functools import wraps
from typing import Callable, TypeVar

from fastapi import HTTPException


def requestAdmin(method):
    def wrapper(self, *args, **kwargs):
        if self.current_user and self.current_user.can_admin():
            return method(self, *args, **kwargs)

        raise HTTPException(status_code=401, detail="Unauthorized")

    return wrapper


RT = TypeVar("RT")


def method_logging(func: Callable[..., RT]) -> Callable[..., RT]:
    @wraps(func)
    def wrapper(*args, **kwargs):
        logging.debug(
            "- %s" % "call method "
            + func.__code__.co_name
            + " in: "
            + func.__code__.co_filename
            + " line: "
            + str(func.__code__.co_firstlineno)
        )
        return func(*args, **kwargs)

    return wrapper


def class_logging(cls):
    for name, method in cls.__dict__.items():
        if not name.startswith("_") and not type(method) is int:
            setattr(cls, name, method_logging(method))
    return cls
