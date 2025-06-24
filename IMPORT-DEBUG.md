# 🐛 Debug da Funcionalidade de Importação

## Erro Atual
```
(data || []).forEach is not a function
TypeError: (data || []).forEach is not a function
```

Este erro está ocorrendo internamente no Ant Design Table. O problema parece estar no `dataSource` que está sendo passado para a tabela.

## Como Debuggar

### 1. Abrir DevTools
- F12 ou Ctrl+Shift+I
- Ir para a aba "Console"

### 2. Testar Importação
1. Use o arquivo `/templates/test-simple.json` 
2. Clique em "Importar WBS"
3. Selecione o arquivo `test-simple.json`
4. Observe os logs no console

### 3. Logs Esperados
```
📂 Iniciando importação JSON test-simple.json
📄 Texto do arquivo lido ...
🔍 Dados parseados {...}
🔧 Processando node {...}
✅ Node criado {...}
✅ Resultado da validação {...}
💰 Custos recalculados {...}
📊 Resumo gerado {...}
📊 Preview: Dados recebidos {...}
🌳 Iniciando flatten da árvore {...}
📝 Adicionando linha à tabela {...}
📋 Dados finais da tabela [...]
```

## Verificações

### ✅ Verificar se:
- [ ] `rootNode` é um objeto válido
- [ ] `rootNode.children` é um array
- [ ] `tableData` é um array válido
- [ ] Todos os objetos em `tableData` têm propriedade `key`
- [ ] Não há valores `null` ou `undefined` em `tableData`

### 🔧 Possíveis Soluções
1. **Problema no rootNode**: Verificar se a estrutura TreeNode está correta
2. **Problema no tableData**: Garantir que é sempre um array válido
3. **Problema no Ant Design**: Usar `dataSource={[...tableData]}` ou forçar re-render
4. **Problema de timing**: Usar `useEffect` para garantir que dados estejam prontos

## Arquivos Modificados
- `src/services/importService.ts` - Logs adicionados
- `src/components/ImportWBS.tsx` - Validações e logs adicionados
- `templates/test-simple.json` - Arquivo de teste simples

## Próximos Passos
1. Testar com arquivo simples
2. Verificar logs no console
3. Identificar onde exatamente falha
4. Corrigir problema específico
5. Remover logs de debug quando funcionar 