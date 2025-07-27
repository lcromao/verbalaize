#!/bin/bash

echo "🧹 Limpando arquivos desnecessários do frontend..."

# Páginas backup
echo "📄 Removendo páginas backup..."
rm -f frontend/src/pages/RealTimeTranscription_backup.tsx
rm -f frontend/src/pages/RealTimeTranscription_fixed.tsx

# Componentes UI não utilizados
echo "🎨 Removendo componentes UI não utilizados..."
rm -f frontend/src/components/ui/accordion.tsx
rm -f frontend/src/components/ui/alert-dialog.tsx
rm -f frontend/src/components/ui/aspect-ratio.tsx
rm -f frontend/src/components/ui/breadcrumb.tsx
rm -f frontend/src/components/ui/calendar.tsx
rm -f frontend/src/components/ui/carousel.tsx
rm -f frontend/src/components/ui/chart.tsx
rm -f frontend/src/components/ui/checkbox.tsx
rm -f frontend/src/components/ui/collapsible.tsx
rm -f frontend/src/components/ui/command.tsx
rm -f frontend/src/components/ui/context-menu.tsx
rm -f frontend/src/components/ui/drawer.tsx
rm -f frontend/src/components/ui/form.tsx
rm -f frontend/src/components/ui/hover-card.tsx
rm -f frontend/src/components/ui/input-otp.tsx
rm -f frontend/src/components/ui/label.tsx
rm -f frontend/src/components/ui/menubar.tsx
rm -f frontend/src/components/ui/navigation-menu.tsx
rm -f frontend/src/components/ui/pagination.tsx
rm -f frontend/src/components/ui/popover.tsx
rm -f frontend/src/components/ui/progress.tsx
rm -f frontend/src/components/ui/radio-group.tsx
rm -f frontend/src/components/ui/resizable.tsx
rm -f frontend/src/components/ui/scroll-area.tsx
rm -f frontend/src/components/ui/sheet.tsx
rm -f frontend/src/components/ui/sidebar.tsx
rm -f frontend/src/components/ui/slider.tsx
rm -f frontend/src/components/ui/sonner.tsx
rm -f frontend/src/components/ui/switch.tsx
rm -f frontend/src/components/ui/table.tsx
rm -f frontend/src/components/ui/tabs.tsx
rm -f frontend/src/components/ui/toggle-group.tsx
rm -f frontend/src/components/ui/toggle.tsx
rm -f frontend/src/components/ui/tooltip.tsx

# Arquivo toast duplicado
echo "🔧 Removendo arquivo duplicado..."
rm -f frontend/src/components/ui/use-toast.ts

# Documentação template
echo "📄 Removendo documentação template..."
rm -f frontend/README.md

# Assets não utilizados
echo "🖼️ Removendo assets não utilizados..."
rm -f frontend/public/placeholder.svg
rm -f frontend/src/App.css

echo "✅ Limpeza concluída! Arquivos removidos:"
echo "   • 2 páginas backup"
echo "   • 32 componentes UI não utilizados"
echo "   • 1 arquivo toast duplicado"
echo "   • 1 README template"
echo "   • 2 assets não utilizados"
echo ""
echo "💾 Espaço estimado economizado: ~800KB"
echo "🎯 Componentes mantidos: button, badge, card, textarea, select, dropdown-menu, input, dialog, alert, skeleton, separator, toast, toaster"
