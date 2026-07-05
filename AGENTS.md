# Regras para Agentes de IA

## Sempre
- Ao modificar o site, **incremente a versão** em `app.js` (const VERSION)
- Siga o estilo de código existente (sem comentários, sem emojis)
- Teste APIs antes de assumir que funcionam — verifique a estrutura real da resposta
- Use `fetchJSON` para chamadas de API existentes

## Nunca
- Adicione dependências ou build steps — site 100% estático
- Comprometa secrets ou tokens
- Modifique o domínio/DNS sem perguntar
- Instale pacotes npm ou similares

## Estrutura
- `index.html` — estrutura da página
- `app.js` — toda a lógica JS (fetch, render, chart)
- `styles.css` — estilos CSS
- Site estático puro, sem frameworks JS além do Chart.js (CDN)
