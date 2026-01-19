# Paleta de Cores - Gravador Médico

## 🎨 Cores Principais

### Teal Medical Green (Cor Principal)
- **HEX:** `#3D8B7E`
- **Uso:** Cor primária da marca, botões principais, destaques
- **Tailwind:** `brand-500` (padrão: `brand`)

### Soft Teal Gradient
- **HEX:** `#8BC4BA`
- **Uso:** Degradês, fundos suaves, hover states
- **Tailwind:** `brand-300`

### White (Branco Clínico)
- **HEX:** `#FFFFFF`
- **Uso:** Fundos, cards, áreas de conteúdo
- **Tailwind:** `white`

### Light Gray (Cinza Claro)
- **HEX:** `#F7F7F7`
- **Uso:** Fundos secundários, separadores sutis
- **Tailwind:** `gray-100`

---

## 📊 Escala Completa de Teal

| Variante | HEX | Uso |
|----------|-----|-----|
| `brand-50` | `#E8F4F2` | Fundos muito claros, hover suave |
| `brand-100` | `#D1E9E5` | Fundos claros, badges |
| `brand-200` | `#A3D3CB` | Bordas, separadores |
| `brand-300` | `#8BC4BA` | Soft Teal Gradient, elementos secundários |
| `brand-400` | `#64A89A` | Estados hover, destaques médios |
| `brand-500` | `#3D8B7E` | **Teal Medical Green (principal)** |
| `brand-600` | `#327362` | Hover de botões primários |
| `brand-700` | `#275A4C` | Textos escuros sobre fundos claros |
| `brand-800` | `#1C4236` | Textos muito escuros |
| `brand-900` | `#112920` | Preto verdejante |

---

## 🎯 Exemplos de Uso

### Botões Primários
```tsx
className="bg-gradient-to-r from-brand-500 to-brand-300"
```

### Cards com Destaque
```tsx
className="border-2 border-brand-200 hover:border-brand-400"
```

### Fundos Suaves
```tsx
className="bg-gradient-to-br from-brand-50 to-brand-100"
```

### Textos Destacados
```tsx
className="text-brand-600"
```

### Sombras com Teal
```tsx
className="shadow-lg shadow-brand-500/30"
```

---

## ✅ Alterações Realizadas

1. **tailwind.config.ts**
   - Atualizada escala completa de cores `brand`
   - Ajustadas sombras para usar RGB do Teal Medical

2. **app/page.tsx**
   - Substituídas todas as referências `emerald` e `green` por `brand`
   - Degradês atualizados para usar `from-brand-500 to-brand-300`

3. **app/contato/page.tsx**
   - WhatsApp card atualizado para usar cores `brand`

4. **app/cart/page.tsx**
   - Texto de economia atualizado para `text-brand-600`

5. **app/termos-de-uso/page.tsx**
   - Ícones de check atualizados para `text-brand-600`

6. **components/ConfettiButton.tsx**
   - Confetti verde substituído por `#3D8B7E`

---

## 🔄 Como Usar

### Classes Tailwind Comuns
- `bg-brand-500` - Fundo principal
- `text-brand-600` - Texto com destaque
- `border-brand-200` - Bordas suaves
- `hover:bg-brand-600` - Hover em botões
- `from-brand-500 to-brand-300` - Degradê padrão

### Acessibilidade
- Contraste adequado para textos escuros: `brand-700` ou superior
- Para fundos escuros, use `brand-50` a `brand-300`
- Sempre teste contraste em ferramentas WCAG

---

**Data de atualização:** 19 de janeiro de 2026
