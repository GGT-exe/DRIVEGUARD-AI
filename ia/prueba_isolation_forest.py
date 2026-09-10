"""
Prueba exploratoria - Isolation Forest para deteccion de patrones de riesgo (US-08)
Proyecto: DriveGuard AI

Este script usa datos de EJEMPLO (simulados) para validar que el enfoque
funciona antes de conectarlo a los datos reales de la base de datos (EPIC-02).

Variables usadas (ajusta segun lo que realmente estes capturando):
- velocidad (km/h)
- aceleracion (m/s^2)
- distancia_obstaculo (metros)
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# -----------------------------------------------------------------------
# 1. Datos de ejemplo (reemplazar luego por una consulta real a la BD)
# -----------------------------------------------------------------------
np.random.seed(42)

n_normales = 200
n_anomalos = 10

# Comportamiento "normal": velocidad moderada, aceleracion suave,
# buena distancia a obstaculos
datos_normales = pd.DataFrame({
    "velocidad": np.random.normal(60, 8, n_normales),
    "aceleracion": np.random.normal(0, 0.5, n_normales),
    "distancia_obstaculo": np.random.normal(25, 5, n_normales),
})

# Comportamiento "anomalo": frenadas bruscas, velocidad alta,
# poca distancia al obstaculo
datos_anomalos = pd.DataFrame({
    "velocidad": np.random.normal(110, 15, n_anomalos),
    "aceleracion": np.random.normal(-4, 1, n_anomalos),
    "distancia_obstaculo": np.random.normal(4, 2, n_anomalos),
})

datos = pd.concat([datos_normales, datos_anomalos], ignore_index=True)

# -----------------------------------------------------------------------
# 2. Entrenar el modelo Isolation Forest
# -----------------------------------------------------------------------
# contamination = proporcion esperada de datos anomalos (ajustar con datos reales)
modelo = IsolationForest(
    n_estimators=100,
    contamination=0.05,
    random_state=42,
)

modelo.fit(datos)

# Guardamos las columnas originales (las que vio el modelo al entrenar)
columnas_entrada = ["velocidad", "aceleracion", "distancia_obstaculo"]

# -1 = anomalo, 1 = normal
datos["prediccion"] = modelo.predict(datos[columnas_entrada])
datos["nivel_anomalia"] = modelo.decision_function(datos[columnas_entrada])  # mas bajo = mas anomalo

# -----------------------------------------------------------------------
# 3. Revisar resultados
# -----------------------------------------------------------------------
anomalos_detectados = datos[datos["prediccion"] == -1]

print(f"Total de registros analizados: {len(datos)}")
print(f"Registros marcados como anomalos: {len(anomalos_detectados)}\n")
print("Detalle de los registros anomalos detectados:")
print(anomalos_detectados.sort_values("nivel_anomalia").to_string(index=False))

# -----------------------------------------------------------------------
# Siguiente paso (miercoles): reemplazar los datos de ejemplo por una
# consulta real a la base de datos definitiva (US-06) y validar el
# porcentaje de acierto contra incidentes ya conocidos (US-07).
# -----------------------------------------------------------------------