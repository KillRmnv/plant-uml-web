import base64

from sc_client.client import search_by_template, get_link_content
from sc_client.models.sc_construction import ScLinkContentData
from sc_kpm import ScKeynodes
from sc_client import client
from sc_kpm.utils import generate_connector, generate_node
from sc_client.constants import sc_type
from sc_client.models import ScAddr, ScLinkContentType, ScTemplate, ScLinkContent, ScConstruction
from sc_kpm.identifiers import ScAlias
from sc_kpm.utils import get_element_system_identifier
from sc_kpm.utils import get_link_content_data
from typing import List

from sqlalchemy.sql.expression import null
import backend.utils.plant_uml as plant_uml
import logging

class AgentChainExecutor:
    """Класс для выполнения цепочки агентов"""
    
    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)
        pass

    def _identify_agent(self, struct_name: str) -> ScAddr:
        struct_node = ScKeynodes.resolve(struct_name, sc_type.CONST_NODE_STRUCTURE)
        if not struct_node:
            self.logger.error(f"Struct node {struct_name} not found")
            raise ValueError(f"Struct node {struct_name} not found")
        template = ScTemplate()
        template.triple(
            sc_type.VAR_NODE_CLASS>> "_class",
            sc_type.VAR_PERM_POS_ARC >> "_arc",
            struct_node
        )
        results = search_by_template(template)
        for result in results:
            if get_element_system_identifier(result.get("_class")) == "concept_er_diagram":
                self.logger.debug(f"Found ER diagram for struct node {struct_node}")
                return ScKeynodes.resolve("action_generate_er_diagram", sc_type.CONST_NODE_CLASS)
            elif get_element_system_identifier(result.get("_class")) == "concept_state_diagram":
                self.logger.debug(f"Found state diagram for struct node {struct_node}")
                return  ScKeynodes.resolve("action_generate_state_diagram", sc_type.CONST_NODE_CLASS) 
            elif get_element_system_identifier(result.get("_class")) == "concept_use_case_diagram":
                self.logger.debug(f"Found use case diagram for struct node {struct_node}")
                return ScKeynodes.resolve("action_generate_use_case_diagram", sc_type.CONST_NODE_CLASS) 
        self.logger.error(f"Unknown diagram type for struct node {struct_node}")
        raise ValueError(f"Unknown diagram type for struct node {struct_node}")
    
    def _find_and_save_link_content(self, result_node: ScAddr):

        template = ScTemplate()

        template.triple(
            result_node,
            sc_type.VAR_ARC >> "_arc",
            sc_type.VAR_NODE_LINK >> "_link"
        )

        results = search_by_template(template)
        for result in results:
            link_node = result.get("_link")
            content: ScLinkContent = get_link_content(link_node)[0]
            self.logger.info(content.data)
        return content.data


    def _start_agent(self, agent_node: ScAddr, agent_argument: ScAddr) -> ScAddr:
        """Запускает агента и возвращает результат"""
        try:
            action_node = ScKeynodes.resolve('action', sc_type.CONST_NODE_CLASS)
            action_initiated_node = ScKeynodes.resolve('action_initiated', sc_type.CONST_NODE)
            rrel_1_node = ScKeynodes.resolve('rrel_1', sc_type.CONST_NODE_ROLE)
            
            # Создаем экземпляр агента
            agent_instance_node = generate_node(sc_type.CONST_NODE)
            
            # Связываем аргумент с агентом через rrel_1
            self.generate_role_relation(agent_instance_node, agent_argument, rrel_1_node)
            
            # Создаем связи для запуска агента
            generate_connector(sc_type.CONST_PERM_POS_ARC, action_node, agent_instance_node)
            generate_connector(sc_type.CONST_PERM_POS_ARC, agent_node, agent_instance_node)
            generate_connector(sc_type.CONST_PERM_POS_ARC, action_initiated_node, agent_instance_node)
            
            self.logger.info(f"Запущен агент: {get_element_system_identifier(agent_node)}")
            
            # Ждем завершения агента и получаем результат
            return self._wait_for_agent_result(agent_instance_node)
            
        except Exception as e:
            self.logger.error(f"Ошибка при запуске агента {get_element_system_identifier(agent_node)}: {e}")
            return None

    def _wait_for_agent_result(self, agent_instance_node: ScAddr) -> ScAddr:
        """Ожидает завершения агента и возвращает результат"""
        import time
        from sc_client.client import search_by_template
        from sc_client.models import ScTemplate
        
        max_wait_time = 400  # секунд
        check_interval = 0.5  # секунд
        waited_time = 0
        
        nrel_result = ScKeynodes.resolve("nrel_result", sc_type.CONST_NODE_NON_ROLE)
        
        while waited_time < max_wait_time:
            try:
                # Ищем результат агента
                template = ScTemplate()
                template.quintuple(
                    agent_instance_node,
                    sc_type.VAR_ARC >> "_main_arc",
                    sc_type.VAR_NODE >> "_result_tuple",
                    sc_type.VAR_PERM_POS_ARC >> "_rel_arc",
                    nrel_result
                )
                
                results = search_by_template(template)
                
                if results:
                    result_tuple_node = results[0].get("_result_tuple")
                    if result_tuple_node and result_tuple_node.is_valid():
                        self.logger.info(f"Агент завершился, найден результат: {result_tuple_node}")
                        template = ScTemplate()
                        template.triple(
                            result_node,
                            sc_type.VAR_ARC >> "_arc",
                            sc_type.VAR_NODE_LINK >> "_link"
                        )
                        results = search_by_template(template)
                        plantCode = None
                        for result in results:
                            link_node = result.get("_link")
                            if not plantCode or len(get_link_content_data(link_node)) < len(get_link_content_data(plantCode)):
                                plantCode = link_node
                        if plantCode and plantCode.is_valid():
                            self.logger.info(f"Найден результат: {plantCode}")
                            return plantCode
                        return result_tuple_node
                
                # Проверяем статус завершения агента
                if self._is_agent_finished(agent_instance_node):
                    self.logger.info("Агент завершился, но результат не найден")
                    return None
                    
                time.sleep(check_interval)
                waited_time += check_interval
                
            except Exception as e:
                self.logger.error(f"Ошибка при ожидании результата агента: {e}")
                time.sleep(check_interval)
                waited_time += check_interval
        
        self.logger.info(f"Таймаут ожидания результата агента ({max_wait_time} секунд)")
        return None

    def _is_agent_finished(self, agent_instance_node: ScAddr) -> bool:
        """Проверяет, завершился ли агент"""
        from sc_client.client import search_by_template
        from sc_client.models import ScTemplate
        
        try:
            action_finished_node = ScKeynodes.resolve('action_finished', sc_type.CONST_NODE)
            
            template = ScTemplate()
            template.triple(
                action_finished_node,
                sc_type.VAR_PERM_POS_ARC >> "_arc",
                agent_instance_node
            )
            
            results = search_by_template(template)
            return len(results) > 0
            
        except Exception as e:
            self.logger.error(f"Ошибка при проверке статуса агента: {e}")
            return False
        
    def generate_role_relation(self, src: ScAddr, trg: ScAddr, *rrel_nodes: ScAddr) -> List[ScAddr]:
        return self.generate_binary_relation(sc_type.CONST_PERM_POS_ARC, src, trg, *rrel_nodes)

    def generate_non_role_relation(self, src: ScAddr, trg: ScAddr, *nrel_nodes: ScAddr) -> List[ScAddr]:
        return self.generate_binary_relation(sc_type.CONST_COMMON_ARC, src, trg, *nrel_nodes)
    
    def generate_binary_relation(self, connector_type: sc_type, src: ScAddr, trg: ScAddr, *relations: ScAddr) -> List[ScAddr]:
        """Переопределённый метод, возвращающий всю конструкцию"""
        construction = ScConstruction()
        
        # Создаём основную дугу отношения
        construction.generate_connector(connector_type, src, trg, ScAlias.RELATION_ARC)
        
        # Создаём связи для каждого отношения
        for relation in relations:
            construction.generate_connector(sc_type.CONST_PERM_POS_ARC, relation, ScAlias.RELATION_ARC)
        
        # Генерируем все элементы и возвращаем всю конструкцию
        all_elements = client.generate_elements(construction)
        return all_elements
        
        
    def _encode_png_into_base64(self, png_data: bytes) -> str:
        return base64.b64encode(png_data).decode('utf-8')
        
        
    def generate_diagram(self,struct_name:str ) -> tuple[ScLinkContentData,str]:
        self.logger.info(f"Generating diagram for struct {struct_name}")
        agent=self._identify_agent(struct_name)
        self.logger.info(f"Identify agent: {agent}")
        struct_node = ScKeynodes.resolve(struct_name, sc_type.CONST_NODE_STRUCTURE)
        self.logger.info(f"Struct node: {struct_node}")
        result=self._start_agent(agent,struct_node)
        self.logger.info(f"Agent result: {result}")
        link_content = get_link_content(result)[0].content_type 
        self.logger.info(f"Link content: {link_content}")
        if link_content== ScLinkContentType.STRING:
            link_content_data = get_link_content_data(result)
            image_bytes = plant_uml.plantuml_to_image(link_content_data)
            return link_content_data,self._encode_png_into_base64(image_bytes)
        else:
            raise ValueError(f"Unsupported link content type: {link_content}")

        