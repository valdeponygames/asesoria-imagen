# Asesoría de Imagen Personal y Corporativa

Simulador de exámenes tipo test para repasar las asignaturas del ciclo:

- Protocolo y organización de eventos
- Habilidades comunicativas
- Estilismo en vestuario y complementos
- Asesoría estética
- Asesoría de peluquería
- Itinerario personal para la empleabilidad I
- Ampliación de itinerario personal para la empleabilidad I

Más de 4.500 preguntas (≥100 por tema). Eliges los temas, se genera un examen y en la corrección cada pregunta indica asignatura, tema y página donde repasar.

Web estática: funciona abriendo `index.html` o publicada con GitHub Pages.

## Añadir un tema
1. Crear `data/<asignatura>_t<n>.js` con `BANCO.add("<asignatura>", n, [[página, "enunciado", "correcta", "incorrecta 1", "incorrecta 2", "incorrecta 3"], ...])`.
2. Añadir el título del tema en `config.js`.
