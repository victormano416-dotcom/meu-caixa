# Meu Caixa

App de controle financeiro pessoal em React + Tailwind.

## Funcionalidades
- Entradas e gastos (fixos / variáveis, recorrentes)
- Cartões de crédito com compras parceladas e fatura
- Resumo do mês e monitoramento por categoria
- Lançamento rápido (usa API da Anthropic — precisa de chave/proxy para funcionar no browser)

## Rodar localmente

```bash
npm install
npm run dev
```

## Deploy grátis (Vercel)

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Importe este repositório
3. Deploy automático

Ou use o botão:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/victormano416-dotcom/meu-caixa)

## Stack
- React 18
- Vite
- Tailwind CSS
- localStorage para persistência

Dados ficam salvos no navegador do usuário.
