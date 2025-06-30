# Figuras de Mérito - Indicadores de Performance

## Visão Geral

O módulo de **Figuras de Mérito** (Merit Figures) é uma funcionalidade avançada que permite criar, gerenciar e monitorar indicadores de performance (KPIs) do projeto. Esta funcionalidade permite que você defina métricas específicas e configure como cada fase do projeto impacta esses indicadores.

## Características Principais

### 🎯 Indicadores Personalizáveis
- **Categorias**: Custo, Tempo, Qualidade, Escopo, Risco, Recursos, Personalizado
- **Direções**: Aumentar, Diminuir, Manter
- **Unidades**: Personalizáveis (%, $, dias, horas, etc.)
- **Pesos**: Sistema de priorização de 1-10

### 📊 Monitoramento em Tempo Real
- **Progresso Automático**: Cálculo automático do progresso baseado em valores atuais vs. metas
- **Status Inteligente**: Classificação automática (No Prazo, Em Risco, Fora do Prazo, Concluído)
- **Métricas Agregadas**: Visão geral de todos os indicadores

### 🔗 Integração com WBS
- **Impactos por Fase**: Configure como cada fase do projeto impacta cada indicador
- **Percentuais de Impacto**: Valores de -100% a +100% (negativo = dificulta, positivo = ajuda)
- **Descrições Detalhadas**: Documente como cada fase afeta o indicador

## Como Usar

### 1. Acessando a Funcionalidade

1. Na barra de navegação principal, clique no botão **"Méritos"** (ícone de troféu 🏆)
2. Você será direcionado para a tela de Figuras de Mérito

### 2. Criando um Indicador

1. Clique no botão **"Adicionar Figura de Mérito"**
2. Preencha os campos:
   - **Nome**: Nome descritivo do indicador
   - **Descrição**: Explicação detalhada do que o indicador mede
   - **Categoria**: Selecione a categoria apropriada
   - **Unidade**: Unidade de medida (%, $, dias, etc.)
   - **Valor Base**: Valor inicial/referência
   - **Valor Atual**: Valor atual do indicador
   - **Valor Meta**: Valor alvo a ser alcançado
   - **Direção**: Se queremos aumentar, diminuir ou manter
   - **Peso**: Importância do indicador (1-10)

### 3. Configurando Impactos das Fases

1. Na tabela de indicadores, clique no ícone de visualização (👁️) de um indicador
2. Configure para cada fase do projeto:
   - **Impacto (%)**: -100 a +100 (negativo = dificulta, positivo = ajuda)
   - **Tipo de Impacto**: Positivo, Negativo ou Neutro
   - **Peso da Fase**: Importância da fase neste indicador (1-10)
   - **Descrição**: Como a fase impacta o indicador

### 4. Monitorando o Progresso

- **Visão Geral**: Métricas agregadas e progresso médio
- **Tabela Principal**: Lista completa com progresso individual
- **Análise**: Análise detalhada por categoria e top performers

## Exemplos Práticos

### Exemplo 1: Eficiência de Custos
```
Nome: Eficiência de Custos
Categoria: Custo
Unidade: %
Valor Base: 75%
Valor Atual: 82%
Valor Meta: 90%
Direção: Aumentar
Peso: 9

Impactos das Fases:
- Planejamento: +15% (Melhora a eficiência através de melhor planejamento)
- Desenvolvimento: -5% (Pode gerar custos inesperados)
- Testes: +10% (Identifica problemas antes da produção)
```

### Exemplo 2: Qualidade do Produto
```
Nome: Qualidade do Produto
Categoria: Qualidade
Unidade: Pontos (1-10)
Valor Base: 6.5
Valor Atual: 7.2
Valor Meta: 8.5
Direção: Aumentar
Peso: 8

Impactos das Fases:
- Planejamento: +20% (Define padrões de qualidade)
- Desenvolvimento: +30% (Implementa as funcionalidades)
- Testes: +50% (Valida e melhora a qualidade)
```

### Exemplo 3: Prazo de Entrega
```
Nome: Prazo de Entrega
Categoria: Tempo
Unidade: Dias
Valor Base: 120
Valor Atual: 95
Valor Meta: 90
Direção: Diminuir
Peso: 7

Impactos das Fases:
- Planejamento: +10% (Reduz retrabalho)
- Desenvolvimento: -20% (Pode atrasar se houver problemas)
- Testes: +15% (Garante qualidade sem retrabalho)
```

## Cálculo de Progresso

O sistema calcula automaticamente o progresso baseado na direção do indicador:

### Para Indicadores de Aumento
```
Progresso = ((Valor Atual - Valor Base) / (Valor Meta - Valor Base)) × 100
```

### Para Indicadores de Diminuição
```
Progresso = ((Valor Base - Valor Atual) / (Valor Base - Valor Meta)) × 100
```

### Para Indicadores de Manutenção
```
Progresso = 100 - (|Valor Atual - Valor Meta| / Tolerância) × 100
```

## Classificação de Status

- **Concluído**: Progresso ≥ 100%
- **No Prazo**: Progresso ≥ 80%
- **Em Risco**: Progresso ≥ 50%
- **Fora do Prazo**: Progresso < 50%

## Persistência de Dados

- Todos os indicadores são salvos automaticamente no localStorage do navegador
- Os dados persistem entre sessões
- Configurações de impacto das fases são mantidas

## Benefícios

### Para Gerentes de Projeto
- **Visibilidade**: Acompanhe o progresso de múltiplos indicadores simultaneamente
- **Tomada de Decisão**: Identifique rapidamente áreas que precisam de atenção
- **Comunicação**: Apresente métricas claras para stakeholders

### Para Equipes
- **Foco**: Entenda como suas atividades impactam os objetivos do projeto
- **Motivação**: Veja o progresso em tempo real
- **Colaboração**: Trabalhe em conjunto para melhorar os indicadores

### Para Stakeholders
- **Transparência**: Acesso a métricas objetivas do projeto
- **Confiança**: Base para decisões informadas
- **Alinhamento**: Garantia de que o projeto está no caminho certo

## Dicas de Uso

1. **Seja Específico**: Defina indicadores claros e mensuráveis
2. **Revise Regularmente**: Atualize valores atuais periodicamente
3. **Configure Impactos Realistas**: Baseie os percentuais de impacto em dados históricos
4. **Use Pesos Adequadamente**: Priorize indicadores críticos com pesos mais altos
5. **Documente**: Use as descrições para explicar o raciocínio por trás dos impactos

## Suporte

Para dúvidas ou sugestões sobre a funcionalidade de Figuras de Mérito, consulte a documentação completa do projeto ou entre em contato com a equipe de desenvolvimento. 