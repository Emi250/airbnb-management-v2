# Designer Skills Setup Guide

## Instalación Completada ✅

Los **8 designer-skills** de `julianoczkowski/designer-skills` han sido instalados exitosamente en este proyecto.

**Ubicación**: `~\.agents\skills\`

**Agentes soportados**: Antigravity, Claude Code, Codex, Gemini CLI

---

## Skills Disponibles

### 1. **design-flow** 🎯
Orquesta todo el workflow de diseño como una secuencia guiada. **Punto de entrada recomendado**.
- Cubre: Grill → Brief → IA → Tokens → Tasks → Frontend → Review
- Uso: `/design-flow`

### 2. **grill-me** 🔍
Interroga relentlessly sobre tu plan hasta resolver todas las decisiones de diseño.
- Genera entendimiento compartido sin crear archivos
- Uso: `/grill-me`

### 3. **design-brief** 📋
Convierte la sesión de interrogatorio en un brief estructurado.
- Salida: `.design/<feature>/DESIGN_BRIEF.md`
- Incluye exploración del codebase existente
- Uso: `/design-brief`

### 4. **information-architecture** 🗂️
Define navegación, jerarquía de contenido, estructura de páginas, patrones de URL y flujos de usuario.
- Salida: `.design/<feature>/INFORMATION_ARCHITECTURE.md`
- Uso: `/information-architecture`

### 5. **design-tokens** 🎨
Genera un sistema completo de tokens (colores, espaciado, tipografía, movimiento).
- Soporta: light mode y dark mode
- Salida: tokens.css, tailwind.config, etc.
- Uso: `/design-tokens`

### 6. **brief-to-tasks** ✅
Desglosa el brief en un checklist ordenado de tareas verticalmente independientes.
- Salida: `.design/<feature>/TASKS.md`
- Uso: `/brief-to-tasks`

### 7. **frontend-design** 🚀
Construye con una filosofía estética nombrada. Mobile-first, dark mode incluido.
- 8 filosofías disponibles: Dieter Rams, Swiss, Ma, Brutalist, Scandinavian, Art Deco, Neo-Memphis, Editorial
- Usa código existente (CSS vars, Tailwind, componentes)
- Uso: `/frontend-design`

### 8. **design-review** 🔎
Crítica estructurada contra el brief. Soporta revisión visual con screenshots.
- Salida: `.design/<feature>/DESIGN_REVIEW.md`
- Uso: `/design-review`

---

## Flujo de Trabajo Recomendado

```
1. /design-flow          → Ejecutar workflow completo (RECOMENDADO)
   O bien, paso a paso:

2. /grill-me             → Clarificar requisitos
3. /design-brief         → Documentar intención
4. /information-architecture → Definir estructura
5. /design-tokens        → Establecer sistema visual
6. /brief-to-tasks       → Planificar construcción
7. /frontend-design      → Construir componentes
8. /design-review        → Auditoría visual (on-demand)
```

---

## Características Destacadas

✨ **Respeta código existente**: Detecta variables CSS, config Tailwind, temas, componentes

📱 **Mobile-first obligatorio**: 375px → 768px → 1280px

🌙 **Dark mode por defecto**: Genera paletas light y dark con contrast ratios WCAG

🎭 **8 Filosofías estéticas** (no genéricas):
- Dieter Rams (minimalismo funcional)
- Swiss/International Typographic (grid estructurado)
- Japanese Minimalism/Ma (espacio negativo)
- Brutalist (anti-pulido)
- Scandinavian (calidez + restricción)
- Art Deco (lujo geométrico)
- Neo-Memphis (caos lúdico)
- Editorial/Magazine (contenido liderado)

---

## Estructura de Salida

Los skills guardan documentación en `.design/<feature-slug>/`:

```
.design/
├── <feature-name>/
│   ├── DESIGN_BRIEF.md
│   ├── INFORMATION_ARCHITECTURE.md
│   ├── DESIGN_TOKENS.css (o .js/.ts)
│   ├── TASKS.md
│   ├── DESIGN_REVIEW.md
│   └── screenshots/
│       ├── page-desktop-1280.png
│       ├── page-tablet-768.png
│       ├── page-mobile-375.png
│       └── page-dark-mode-*.png
```

---

## Notas Importantes

⚠️ **Seguridad**: Los skills ejecutan con permisos completos del agente. Revisar antes de usar en contextos sensibles.

📄 **Documentación**: Todos los skills incluyen instrucciones detalladas al ejecutarse.

🔄 **Flexibilidad**: Puedes saltarte fases según sea necesario (ej: si ya tienes tokens, ve directo a `/frontend-design`).

---

## Más Información

- Repositorio: https://github.com/julianoczkowski/designer-skills
- Licencia: Apache 2.0
- Autor: Julian Oczkowski

---

**¿Listo para empezar?** Ejecuta `/design-flow` para la experiencia completa guiada.
