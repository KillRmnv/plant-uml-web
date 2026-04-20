import subprocess
import tempfile
import os
import base64

def plantuml_to_image(plantuml_code: str, jar_path: str = "plantuml.jar", output_format: str = "png") -> bytes:
    """
    Конвертирует PlantUML код в изображение
    
    Args:
        plantuml_code: Строка с PlantUML кодом
        jar_path: Путь к plantuml.jar файлу
        output_format: Формат вывода (png, svg, txt, etc.)
    
    Returns:
        Байты изображения
    
    Raises:
        Exception: При ошибке компиляции
    """
    # Создаем временные файлы
    with tempfile.NamedTemporaryFile(mode='w', suffix='.puml', delete=False) as puml_file:
        puml_file.write(plantuml_code)
        puml_path = puml_file.name
    
    try:
        # Запускаем PlantUML
        result = subprocess.run(
            ['java', '-jar', jar_path, '-t' + output_format, puml_path],
            capture_output=True,
            text=True
        )
        
        # Проверяем ошибки
        if result.returncode != 0:
            raise Exception(f"PlantUML ошибка: {result.stderr or result.stdout}")
        
        # Читаем сгенерированный файл
        output_path = puml_path.replace('.puml', f'.{output_format}')
        if not os.path.exists(output_path):
            raise Exception("Не удалось создать выходной файл")
        
        with open(output_path, 'rb') as img_file:
            image_bytes = img_file.read()
        
        return image_bytes
        
    finally:
        # Очищаем временные файлы
        os.unlink(puml_path)
        output_path = puml_path.replace('.puml', f'.{output_format}')
        if os.path.exists(output_path):
            os.unlink(output_path)