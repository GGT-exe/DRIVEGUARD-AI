# Evidencia H20: exportación a PDF

- Responsable: Sandrid
- Fecha de la prueba: 2026-10-10
- Prueba: 60 filas simuladas con el código de generación de /reportes/exportar (pdfkit)

| Verificación | Resultado |
|---|---|
| Tildes y ñ (José Peñaloza, Sofía Ñañez, Ñandú Güemes, Óscar Úñiga) | OK |
| 60 filas en 2 páginas (31 en la primera y 29 en la segunda) | OK |
| Encabezado azul repetido en la página 2 | OK |
| Nivel nulo mostrado como "-" | OK |
| Nombre de más de 50 caracteres | Falla: se parte en dos líneas y se superpone con la fila siguiente |
| Fecha "Generado el" | Se calcula en UTC, por lo que después de las 7 pm hora Colombia muestra el día siguiente |

Conclusión: el PDF se genera bien con tildes, ñ y varias páginas. Pendiente de corregir: los nombres largos se desbordan de la fila (ellipsis no corta el texto) y la fecha del encabezado debería usar la zona America/Bogota.
