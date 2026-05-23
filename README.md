# SKRATICA (El Skrabble de ATICA)

Scrabble colaborativo para ATICA. Cada ronda dura **1 hora** y pasado ese tiempo se puede iniciar otra.

## Cómo empieza

Al entrar al juego se te asigna **aleatoriamente** un equipo y una **ficha con una letra** (cada letra tiene una puntuación distinta). El número de equipos lo decide el administrador al generar la ronda (2, 3 o 4 equipos).

## Roles

### Capitán
El equipo elige a un capitán. Su misión:
- **Da acceso a la ronda** al resto del equipo: los jugadores escanean su QR para empezar a jugar.
- Escanea los códigos QR de las palabras validadas por sus compañeros para sumar puntos.
- No descubre su letra hasta el final de la ronda.
- Cuando ya no queden más palabras que recopilar, **finaliza la ronda**. En ese momento se revela su letra y se suma su valor multiplicado por las veces que aparece en las palabras recopiladas.

### Jugador
Cada jugador tiene su letra y debe elegir **una sola vez** entre dos caminos:

- **Compartir** su letra con otro compañero para que forme una palabra. A partir de ahí actúa como observador y ya no puede recopilar más letras.
- **Recopilar** letras de otros compañeros para formar una palabra válida y entregarla al capitán.

## Cómo se juega paso a paso

1. **Elegir capitán** — Un miembro de cada equipo se ofrece como capitán y pulsa el botón que le asigna ese rol, sin vuelta atrás.
2. **Escanear al capitán** — El resto del equipo escanea el QR del capitán para empezar a jugar.
2. **Compartir o recopilar** — Decides si cedes tu letra o acumulas letras de otros. Esta decisión es **irreversible** durante la ronda.
3. **Recopilar letras** — Escanea los QR de las letras que te compartan tus compañeros. Cada letra escaneada puede recibir un **bonus aleatorio**:
   - **×2L / ×3L** — Duplica/triplica el valor de la letra.
   - **×2P / ×3P** — Duplica/triplica el valor total de la palabra.
   - Los bonus de letra se aplican **solo** en posición **impar** (×3) o **par** (×2). Los bonus de palabra igual.
4. **Formar la palabra** — Puedes reordenar tus letras como quieras y no estás obligado a usarlas todas para formar una palabra.
5. **Validar** — Si la palabra existe en el diccionario, se considera válida. Es igual de justo para todos.
6. **Entregar al capitán** — La palabra validada muestra un QR para que el capitán lo escanee.
7. **Compartir sobrantes** — Las letras que no usaste se pueden volver a compartir con otros jugadores que sigan recopilando. Si la letra tenía un bonus, **se pierde** al compartirla (la siguiente persona que la reciba podrá obtener un bonus nuevo).

## Puntuación final

Cuando el capitán da por terminada la ronda:
- Se suma la puntuación de todas las palabras recopiladas.
- Se revela la letra del capitán.
- Su valor se multiplica por el número de veces que esa letra aparece en las palabras recopiladas y se añade al total.

El equipo con más puntos gana la ronda.

## Consejos

- **Comparte solo si estás seguro** de que alguien necesita tu letra. No hay vuelta atrás.
- **No recopiles sin un plan**. Asegúrate de poder formar una palabra antes de acumular letras.
- **No acumules de más**. Recopila solo las que necesites; si sobran tras validar la palabra, puedes volver a compartirlas.

# Diagrama de flujo del juego

```mermaid
flowchart TD
    START([Entrar al juego]) --> ASSIGN[Asignación aleatoria<br>de equipo y letra]
    ASSIGN --> CAPTAIN_DECISION{¿Te conviertes<br>en capitán?}

    CAPTAIN_DECISION -->|Sí| BECOME_CAPTAIN[Activar modo capitán<br>- genera tu QR personal]
    CAPTAIN_DECISION -->|No| SCAN_CAPTAIN[Escanea el QR del capitán<br>para empezar a jugar]

    subgraph Capitán
        BECOME_CAPTAIN --> WAIT[Espera palabras validadas<br>de tus compañeros]
        WAIT --> SCAN_WORD[Escanea QR de palabras<br>y acumula puntos]
        SCAN_WORD --> MORE{¿Quedan más<br>palabras?}
        MORE -->|Sí| WAIT
        MORE -->|No| FINISH[Finalizar la ronda]
        FINISH --> REVEAL[Se revela tu letra de capitán<br>x N apariciones en palabras]
        REVEAL --> TOTAL[Suma total del equipo]
        TOTAL --> WIN([El equipo con más<br>puntos gana la ronda])
    end

    subgraph Jugador
        SCAN_CAPTAIN --> DECIDE{¿Compartes tu letra<br>o recopilas letras?}
        DECIDE -->|Compartir| SHARE[Compartes tu letra<br>con un compañero]
        SHARE --> OBSERVER[Pasas a observador<br>- tu ronda ha terminado]
        DECIDE -->|Recopilar| COLLECT[Escanea letras que<br>te compartan otros]
        COLLECT --> BONUS[Cada letra puede recibir<br>un bonus aleatorio]
        BONUS --> REORDER[Reordena las letras<br>y forma una palabra]
        REORDER --> VALIDATE{¿La palabra es<br>válida en el diccionario?}
        VALIDATE -->|No| REORDER
        VALIDATE -->|Sí| DELIVER[Genera QR con la palabra<br>válida y su puntuación]
        DELIVER --> SURPLUS[Comparte letras sobrantes<br>con otros compañeros]
        SURPLUS --> OBSERVER
    end

    OBSERVER --> WAIT
```

# Iniciar partida

## 2 equipos
[Iniciar Ronda 2 Equipos](https://juanjmerono.github.io/skratica/?teams=2)

<img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=https://juanjmerono.github.io/skratica/?teams=2" alt="QR2">

## 3 equipos
[Iniciar Ronda 3 Equipos](https://juanjmerono.github.io/skratica/?teams=3)

<img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=https://juanjmerono.github.io/skratica/?teams=3" alt="QR3">

## 4 equipos
[Iniciar Ronda 4 Equipos](https://juanjmerono.github.io/skratica/?teams=4)

<img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=https://juanjmerono.github.io/skratica/?teams=4" alt="QR4">

# Pruebas

Utiliza esta página para probar el juego.

[Test Game](https://juanjmerono.github.io/skratica/test.html)
