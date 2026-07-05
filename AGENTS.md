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

## API
- `pystats.cc.cd/api/{pacote}` retorna JSON com todos os dados do pacote
- A API funciona via 404.html + detecção de path `/api/` no JS
- A API também funciona como web UI em `pystats.cc.cd/{pacote}`

## Estrutura
- `index.html` — estrutura da página (também usado como 404.html para rotas)
- `404.html` — cópia do index.html (GitHub Pages serve pra paths desconhecidos)
- `app.js` — toda a lógica JS (fetch, render, chart, API, roteamento)
- `styles.css` — estilos CSS
- Site estático puro, sem frameworks JS além do Chart.js (CDN)
