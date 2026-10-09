# RH Racing 69 · Web

Landing de RH Racing 69 (taller, concesionario Km 0 y reprogramación con ReproPowerTechnology) rediseñada como el menú de un videojuego de carreras.

Es una web estática sin dependencias ni paso de compilación: basta con servir la carpeta (`index.html` es la portada).

```
index.html      Contenido y estructura (incluye el sprite de iconos SVG)
styles.css      Estilos
scripts.js      Interacción (garaje, consola de repro, formulario…)
assets/
  brand/        Logos, favicon e imagen para redes (og)
  motos/        Motos recortadas sin fondo (.webp) + miniaturas (-thumb.webp)
  equipo/       Foto del equipo
```

## Secciones

1. **Menú principal**: selector de modo con tres casillas (Compra, Reparación, Repro) que llevan a su sección.
2. **Garaje Km 0**: el selector de motos, con escenario, plataforma giratoria, índice RH por clases (D–X), radar de perfil, barras de ficha técnica con diferencias al cambiar de moto, filtros por marca y cilindrada, teclado (← →), deslizar en móvil y enlace directo a una moto (`?moto=suzuki-hayabusa`).
3. **Taller**, 4. **Reprogramación** (consola de tuning con pestañas), 5. **Equipo**, 6. **Pilotos** y 7. **Reserva**.

Atajos: `Q` / `E` cambian de sección; `←` / `→` cambian de moto en el garaje. Los sonidos de interfaz están desactivados por defecto (botón del altavoz).

## Añadir o editar una moto

Cada moto es un `<li>` dentro de `<ol id="roster">` en `index.html`. Los datos van en el botón:

```html
<button type="button" class="bike-tile" aria-pressed="false"
    data-id="suzuki-sv650" data-brand="Suzuki" data-model="SV650" data-type="naked"
    data-cc="645" data-cv="73" data-nm="63" data-kg="198" data-vmax="205"
    data-img="assets/motos/suzuki-sv650.webp" data-w="778" data-h="492">
```

- `data-type`: `scrambler`, `trail`, `rally`, `naked`, `sport`, `adventure` o `scooter` (define el color del escenario).
- La valoración RH (radar), el índice de clase y el carnet se calculan solos a partir de la ficha.
- Imagen: un `.webp` con fondo transparente (`data-w` / `data-h` son su tamaño en píxeles) y una miniatura `-thumb.webp` de unos 360 px de ancho.

Los datos técnicos son orientativos según fabricante; conviene revisarlos con la ficha oficial de cada versión.

## Pendiente

El formulario de reserva valida los datos pero **no envía nada a ningún servidor** (igual que en la versión anterior): muestra la confirmación y ofrece enviar el resumen por WhatsApp. Para recibir las reservas hay que conectarlo a un servicio de formularios o a un backend.
