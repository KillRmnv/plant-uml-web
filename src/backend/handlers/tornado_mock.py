# Mock tornado module for api_logic.py compatibility
import sys
from types import ModuleType


# Create mock tornado module with submodules
class MockTornadoModule(ModuleType):
    def __getattr__(self, name):
        if name == "web":
            return MockWebModule()
        if name == "options":
            return MockOptionsModule()
        return ModuleType(f"tornado.{name}")


class MockWebModule(ModuleType):
    def __init__(self):
        super().__init__("tornado.web")
        self.BaseHandler = object


class MockOptionsModule(ModuleType):
    def __init__(self):
        super().__init__("tornado.options")

    @property
    def options(self):
        class _Options:
            action_result_wait_timeout = 2
            event_wait_timeout = 10

        return _Options()


tornado = MockTornadoModule("tornado")
sys.modules["tornado"] = tornado
sys.modules["tornado.web"] = MockWebModule()
sys.modules["tornado.options"] = MockOptionsModule()
