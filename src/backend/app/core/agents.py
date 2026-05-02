import base64
import logging
import time
from typing import List, Optional

from sc_client import client
from sc_client.client import search_by_template, get_link_content
from sc_client.constants import sc_type
from sc_client.models import ScAddr, ScTemplate, ScLinkContent, ScConstruction, ScLinkContentType
from sc_client.models.sc_construction import ScLinkContentData
from sc_kpm import ScKeynodes
from sc_kpm.identifiers import ScAlias
from sc_kpm.utils import generate_connector, generate_node, get_element_system_identifier, get_link_content_data


# Маппинг концептов диаграмм к соответствующим действиям
DIAGRAM_ACTION_MAP = {
    "concept_er_diagram": "action_generate_er_diagram",
    "concept_state_diagram": "action_generate_state_diagram",
    "concept_use_case_diagram": "action_generate_use_case_diagram",
}

AGENT_MAX_WAIT_SECONDS = 10
AGENT_CHECK_INTERVAL_SECONDS = 0.5


class AgentChainExecutor:
    """Класс для выполнения цепочки агентов"""

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)

    def _identify_agent(self, struct_name: str) -> ScAddr:
        """Определяет тип агента по классу структурного узла."""
        struct_node = ScKeynodes.resolve(struct_name, sc_type.CONST_NODE_STRUCTURE)
        if not struct_node:
            raise ValueError(f"Struct node '{struct_name}' not found")

        template = ScTemplate()
        template.triple(
            sc_type.VAR_NODE_CLASS >> "_class",
            sc_type.VAR_PERM_POS_ARC >> "_arc",
            struct_node,
        )

        for result in search_by_template(template):
            class_identifier = get_element_system_identifier(result.get("_class"))
            self.logger.info(f"Found class: {class_identifier}")

            action_name = DIAGRAM_ACTION_MAP.get(class_identifier)
            if action_name:
                self.logger.info(f"Matched diagram type '{class_identifier}' for struct '{struct_name}'")
                return ScKeynodes.resolve(action_name, sc_type.CONST_NODE_CLASS)

        raise ValueError(f"Unknown diagram type for struct node '{struct_name}'")

    def _find_link_content_in_node(self, result_node: ScAddr) -> ScLinkContentData:
        """Находит и возвращает содержимое первой ссылки внутри узла."""
        template = ScTemplate()
        template.triple(
            result_node,
            sc_type.VAR_ARC >> "_arc",
            sc_type.VAR_NODE_LINK >> "_link",
        )

        content: Optional[ScLinkContent] = None
        for result in search_by_template(template):
            link_node = result.get("_link")
            content = get_link_content(link_node)[0]
            self.logger.info(content.data)

        return content.data

    def _start_agent(self, agent_node: ScAddr, agent_argument: ScAddr) -> Optional[tuple[ScLinkContentData, ScLinkContentData]]:
        """Запускает агента и возвращает пару (plantCode, image)."""
        action_node = ScKeynodes.resolve("action", sc_type.CONST_NODE_CLASS)
        action_initiated_node = ScKeynodes.resolve("action_initiated", sc_type.CONST_NODE)
        rrel_1_node = ScKeynodes.resolve("rrel_1", sc_type.CONST_NODE_ROLE)

        agent_instance_node = generate_node(sc_type.CONST_NODE)
        self.generate_role_relation(agent_instance_node, agent_argument, rrel_1_node)

        generate_connector(sc_type.CONST_PERM_POS_ARC, action_node, agent_instance_node)
        generate_connector(sc_type.CONST_PERM_POS_ARC, agent_node, agent_instance_node)
        generate_connector(sc_type.CONST_PERM_POS_ARC, action_initiated_node, agent_instance_node)

        self.logger.info(f"Запущен агент: {get_element_system_identifier(agent_node)}")
        return self._wait_for_agent_result(agent_instance_node)

    def _wait_for_agent_result(self, agent_instance_node: ScAddr) -> Optional[tuple[ScLinkContentData, ScLinkContentData]]:
        """Ожидает завершения агента и возвращает пару (plantCode, image)."""
        nrel_result = ScKeynodes.resolve("nrel_result", sc_type.CONST_NODE_NON_ROLE)
        elapsed = 0.0

        while elapsed < AGENT_MAX_WAIT_SECONDS:
            try:
                result = self._try_extract_agent_result(agent_instance_node, nrel_result)
                if result is not None:
                    return result

                if self._is_agent_finished(agent_instance_node):
                    self.logger.info("Агент завершился, но результат не найден")
                    return None

            except Exception as e:
                self.logger.error(f"Ошибка при ожидании результата агента: {e}")

            time.sleep(AGENT_CHECK_INTERVAL_SECONDS)
            elapsed += AGENT_CHECK_INTERVAL_SECONDS

        self.logger.warning(f"Таймаут ожидания результата агента ({AGENT_MAX_WAIT_SECONDS} сек)")
        return None

    def _try_extract_agent_result(
        self,
        agent_instance_node: ScAddr,
        nrel_result: ScAddr,
    ) -> Optional[tuple[ScLinkContentData, ScLinkContentData]]:
        """Пытается извлечь результат агента из графа. Возвращает None, если ещё не готов."""
        result_node = self._find_result_node(agent_instance_node, nrel_result)
        if result_node is None:
            return None

        result_tuple_node = self._find_result_tuple(result_node)
        if result_tuple_node is None or not result_tuple_node.is_valid():
            return None

        self.logger.info("Found agent result tuple")
        plant_code, image = self._extract_links_from_tuple(result_tuple_node)

        if plant_code and image:
            self.logger.info(f"Найден результат plantCode длиной {len(plant_code)}")
            return plant_code, image

        return None

    def _find_result_node(self, agent_instance_node: ScAddr, nrel_result: ScAddr) -> Optional[ScAddr]:
        """Ищет узел результата агента через nrel_result."""
        template = ScTemplate()
        template.quintuple(
            agent_instance_node,
            sc_type.VAR_ARC >> "_main_arc",
            sc_type.VAR_NODE >> "_result_node",
            sc_type.VAR_PERM_POS_ARC >> "_rel_arc",
            nrel_result,
        )
        results = search_by_template(template)
        if not results:
            return None

        self.logger.info("Found agent result node")
        return results[0].get("_result_node")

    def _find_result_tuple(self, result_node: ScAddr) -> Optional[ScAddr]:
        """Ищет кортеж результата внутри узла результата."""
        template = ScTemplate()
        template.triple(
            result_node,
            sc_type.VAR_PERM_POS_ARC >> "_arc",
            sc_type.NODE_TUPLE >> "_result_tuple",
        )
        results = search_by_template(template)
        return results[0].get("_result_tuple") if results else None

    def _extract_links_from_tuple(
        self, result_tuple_node: ScAddr
    ) -> tuple[Optional[ScLinkContentData], Optional[ScLinkContentData]]:
        """Извлекает plantCode (меньший контент) и image (больший контент) из кортежа."""
        template = ScTemplate()
        template.triple(
            result_tuple_node,
            sc_type.ARC >> "_arc",
            sc_type.NODE >> "_link",
        )
        results = search_by_template(template)
        self.logger.info(f"Found {len(results)} links in result tuple")

        plant_code: Optional[ScLinkContentData] = None
        image: Optional[ScLinkContentData] = None

        for result in results:
            link_node = result.get("_link")
            data = get_link_content_data(link_node)
            self.logger.info(f"Link content length: {len(data)}")

            if plant_code is None or len(data) < len(plant_code):
                plant_code = data
            else:
                image = data

        return plant_code, image

    def _is_agent_finished(self, agent_instance_node: ScAddr) -> bool:
        """Проверяет, завершился ли агент (присутствие в action_finished)."""
        try:
            action_finished_node = ScKeynodes.resolve("action_finished", sc_type.CONST_NODE)
            template = ScTemplate()
            template.triple(
                action_finished_node,
                sc_type.VAR_PERM_POS_ARC >> "_arc",
                agent_instance_node,
            )
            return len(search_by_template(template)) > 0
        except Exception as e:
            self.logger.error(f"Ошибка при проверке статуса агента: {e}")
            return False

    def generate_role_relation(self, src: ScAddr, trg: ScAddr, *rrel_nodes: ScAddr) -> List[ScAddr]:
        return self.generate_binary_relation(sc_type.CONST_PERM_POS_ARC, src, trg, *rrel_nodes)

    def generate_non_role_relation(self, src: ScAddr, trg: ScAddr, *nrel_nodes: ScAddr) -> List[ScAddr]:
        return self.generate_binary_relation(sc_type.CONST_COMMON_ARC, src, trg, *nrel_nodes)

    def generate_binary_relation(
        self, connector_type: sc_type, src: ScAddr, trg: ScAddr, *relations: ScAddr
    ) -> List[ScAddr]:
        """Создаёт бинарное отношение между src и trg с опциональными метками отношений."""
        construction = ScConstruction()
        construction.generate_connector(connector_type, src, trg, ScAlias.RELATION_ARC)
        for relation in relations:
            construction.generate_connector(sc_type.CONST_PERM_POS_ARC, relation, ScAlias.RELATION_ARC)
        return client.generate_elements(construction)

    def generate_diagram(self, struct_name: str) -> tuple[ScLinkContentData, ScLinkContentData]:
        """Запускает подходящего агента для генерации диаграммы по имени структуры."""
        self.logger.info(f"Generating diagram for struct '{struct_name}'")

        agent = self._identify_agent(struct_name)
        self.logger.info(f"Identified agent: {agent}")

        struct_node = ScKeynodes.resolve(struct_name, sc_type.CONST_NODE_STRUCTURE)
        self.logger.info(f"Struct node: {struct_node}")

        plant_code, image = self._start_agent(agent, struct_node)
        self.logger.info("Agent finished successfully")

        return plant_code, image

    @staticmethod
    def _encode_png_to_base64(png_data: bytes) -> str:
        return base64.b64encode(png_data).decode("utf-8")