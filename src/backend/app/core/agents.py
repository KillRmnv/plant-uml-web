from sc_client.client import search_by_template, get_link_content
from sc_kpm import ScKeynodes
from sc_client import client
from sc_kpm.utils import generate_connector, generate_node
from sc_client.constants import sc_type
from sc_client.models import ScAddr, ScTemplate, ScLinkContent, ScConstruction
from sc_kpm.identifiers import ScAlias
from typing import List

class AgentChainExecutor:
    """Класс для выполнения цепочки агентов"""

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
            print(content.data)
        return content.data


    def _start_agent(self, agent_identifier: str, agent_argument: ScAddr) -> ScAddr:
        """Запускает агента и возвращает результат"""
        try:
            action_node = ScKeynodes.resolve('action', sc_type.CONST_NODE_CLASS)
            action_initiated_node = ScKeynodes.resolve('action_initiated', sc_type.CONST_NODE)
            rrel_1_node = ScKeynodes.resolve('rrel_1', sc_type.CONST_NODE_ROLE)
            agent_node = ScKeynodes.resolve(agent_identifier, sc_type.CONST_NODE_CLASS)
            
            # Создаем экземпляр агента
            agent_instance_node = generate_node(sc_type.CONST_NODE)
            
            # Связываем аргумент с агентом через rrel_1
            self.generate_role_relation(agent_instance_node, agent_argument, rrel_1_node)
            
            # Создаем связи для запуска агента
            generate_connector(sc_type.CONST_PERM_POS_ARC, action_node, agent_instance_node)
            generate_connector(sc_type.CONST_PERM_POS_ARC, agent_node, agent_instance_node)
            generate_connector(sc_type.CONST_PERM_POS_ARC, action_initiated_node, agent_instance_node)
            
            print(f"Запущен агент: {agent_identifier}")
            
            # Ждем завершения агента и получаем результат
            return self._wait_for_agent_result(agent_instance_node)
            
        except Exception as e:
            print(f"Ошибка при запуске агента {agent_identifier}: {e}")
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
                    sc_type.VAR_NODE >> "_result",
                    sc_type.VAR_PERM_POS_ARC >> "_rel_arc",
                    nrel_result
                )
                
                results = search_by_template(template)
                
                if results:
                    result_node = results[0].get("_result")
                    if result_node and result_node.is_valid():
                        print(f"Агент завершился, найден результат: {result_node}")
                        return result_node
                
                # Проверяем статус завершения агента
                if self._is_agent_finished(agent_instance_node):
                    print("Агент завершился, но результат не найден")
                    return None
                    
                time.sleep(check_interval)
                waited_time += check_interval
                
            except Exception as e:
                print(f"Ошибка при ожидании результата агента: {e}")
                time.sleep(check_interval)
                waited_time += check_interval
        
        print(f"Таймаут ожидания результата агента ({max_wait_time} секунд)")
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
            print(f"Ошибка при проверке статуса агента: {e}")
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