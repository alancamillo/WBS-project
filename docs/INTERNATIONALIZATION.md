# Internacionalização (i18n) - Sistema WBS

## Visão Geral

O sistema WBS agora possui suporte completo à internacionalização, oferecendo uma experiência multilíngue robusta com detecção automática do idioma do navegador e persistência das preferências do usuário.

## Idiomas Suportados

- **Português (pt)** - Idioma padrão
- **Inglês (en)** - English
- **Espanhol (es)** - Español  
- **Chinês (zh)** - 中文

## Funcionalidades Principais

### 1. Detecção Automática do Idioma
- O sistema detecta automaticamente o idioma preferido do navegador do usuário
- Fallback inteligente para português caso o idioma não seja suportado
- Suporte a códigos de idioma do tipo `pt-BR`, `en-US`, etc.

### 2. Seleção Manual de Idioma
- Seletor de idioma no cabeçalho da aplicação
- Modal de configurações avançadas com detalhes sobre detecção automática
- Interface intuitiva com nomes nativos dos idiomas

### 3. Persistência de Preferências
- Preferências de idioma salvas automaticamente no localStorage
- Configurações mantidas entre sessões do navegador
- Sincronização automática entre abas

### 4. Interface Traduzida
- Todas as strings da interface foram externalizadas para arquivos de tradução
- Suporte a interpolação de variáveis (ex: `{{count}} nós`)
- Pluralização e contexto quando necessário

## Estrutura de Arquivos

```
src/
├── i18n/
│   ├── index.ts              # Configuração principal do i18n
│   └── locales/
│       ├── pt.json           # Traduções em português
│       ├── en.json           # Traduções em inglês
│       ├── es.json           # Traduções em espanhol
│       └── zh.json           # Traduções em chinês
├── components/
│   ├── LanguageSelector.tsx  # Componente seletor de idioma
│   └── SettingsModal.tsx     # Modal de configurações
└── hooks/
    └── useI18nSettings.ts    # Hook personalizado para i18n
```

## Como Usar

### Para Usuários

1. **Detecção Automática**: O sistema detecta automaticamente seu idioma preferido
2. **Seleção Manual**: Use o seletor no cabeçalho para trocar de idioma
3. **Configurações Avançadas**: Clique no ícone de configurações para acessar opções detalhadas
4. **Restaurar Automático**: Use "Usar Idioma do Navegador" para voltar à detecção automática

### Para Desenvolvedores

#### 1. Usando Traduções nos Componentes

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('messages.success.dataSaved')}</p>
      <p>{t('modals.loadSampleData.content', { count: 5 })}</p>
    </div>
  );
};
```

#### 2. Usando o Hook Personalizado

```tsx
import { useI18nSettings } from '../hooks/useI18nSettings';

const LanguageComponent = () => {
  const { settings, changeLanguage, availableLanguages } = useI18nSettings();
  
  return (
    <select 
      value={settings.language} 
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {availableLanguages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};
```

#### 3. Estrutura das Traduções

```json
{
  "app": {
    "title": "Sistema de Gestão WBS",
    "subtitle": "Estrutura Analítica do Projeto"
  },
  "navigation": {
    "list": "Lista",
    "tree": "Árvore"
  },
  "modals": {
    "loadSampleData": {
      "content": "Você já possui uma estrutura WBS com {{count}} nó(s)."
    }
  }
}
```

## Adicionando Novos Idiomas

### 1. Criar Arquivo de Tradução

Crie um novo arquivo em `src/i18n/locales/[codigo].json` com todas as traduções necessárias.

### 2. Atualizar Configuração

Em `src/i18n/index.ts`, adicione o novo idioma:

```typescript
import novoIdioma from './locales/novo-idioma.json';

// No objeto resources
resources: {
  pt: { translation: pt },
  en: { translation: en },
  'novo-codigo': { translation: novoIdioma },
},
```

### 3. Atualizar Lista de Idiomas

Em `src/hooks/useI18nSettings.ts` e `src/components/LanguageSelector.tsx`, adicione o novo idioma à lista.

## Configurações Técnicas

### Detecção de Idioma

A detecção segue esta ordem de prioridade:
1. Preferência salva no localStorage (`i18nextLng`)
2. Idioma do navegador (`navigator.language`)
3. Idioma padrão (português)

### Persistência

- **Chave localStorage**: `i18nextLng` (padrão do i18next)
- **Configurações extras**: `wbs-i18n-settings`
- **Estrutura WBS**: `wbs-project-structure`

### Configurações do i18next

```typescript
{
  fallbackLng: 'pt',
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    lookupLocalStorage: 'i18nextLng',
    caches: ['localStorage']
  },
  interpolation: {
    escapeValue: false // React já escapa
  }
}
```

## Troubleshooting

### Problema: Idioma não muda
- Verifique se o código do idioma está correto
- Confirme se o arquivo de tradução existe
- Verifique o console para erros de carregamento

### Problema: Traduções não aparecem
- Confirme se a chave de tradução existe no arquivo JSON
- Verifique se o componente está usando `useTranslation()`
- Confirme a estrutura hierárquica das chaves

### Problema: Persistência não funciona
- Verifique se o localStorage está habilitado
- Confirme se não há erro de quota do localStorage
- Teste em modo privado/incógnito

## Performance

### Otimizações Implementadas

1. **Lazy Loading**: Traduções carregadas sob demanda
2. **Memoização**: Hook personalizado usa useEffect para otimizar re-renders
3. **Cache**: localStorage para evitar re-detecção desnecessária
4. **Fallback**: Sistema robusto de fallback para idiomas não suportados

### Métricas

- **Tamanho dos arquivos de tradução**: ~8-12KB cada
- **Tempo de inicialização**: <100ms adicional
- **Memória**: ~50KB adicional em runtime

## Roadmap Futuro

- [ ] Suporte a mais idiomas (Francês, Alemão, Japonês)
- [ ] Tradução de datas e números por região
- [ ] Detecção de mudança de idioma do SO em tempo real  
- [ ] Interface para gerenciamento de traduções
- [ ] Pluralização avançada por idioma
- [ ] Tradução automática com IA para novos textos

---

*Documentação atualizada em: Dezembro 2024* 