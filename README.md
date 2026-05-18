# Archetype Identity Lab — versão estática

Landing page de captura de leads para o e-book *Arquétipos de Marca* — Cristiano Oliveira.
**HTML/CSS/JS puro, sem build, sem framework**, pronto para upload direto na Hostinger.

---

## 📂 Arquivos do site

```
site/
├── index.html                       Landing page
├── obrigado.html                    Página de agradecimento (noindex)
├── politica-de-privacidade.html     Política de Privacidade (LGPD)
├── termos-de-uso.html               Termos de Uso
├── styles.css                       CSS escrito à mão
├── app.js                           Form + reveal + sticky CTA
├── og-image.jpg                     OG image 1200×630
├── robots.txt
├── sitemap.xml
├── .htaccess                        Headers, cache, HTTPS
└── assets/
    ├── cristiano.webp
    └── ebook-cover.webp
```

---

## ✅ ANTES DE SUBIR — fazer estes 3 ajustes

### 1. Configurar chaves do Supabase no `app.js`

Abra `app.js` e edite as 2 primeiras linhas reais (linhas 9 e 10):

```js
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "eyJSUA_CHAVE_ANON_AQUI";
```

Pegue esses valores no painel do Supabase em **Settings → API**:
- `Project URL` → `SUPABASE_URL`
- `anon` `public` key → `SUPABASE_ANON_KEY`

⚠️ A **service role key** NUNCA vai aqui. Só a anon (publishable).

### 2. Aplicar a migration LGPD no Supabase

No painel Supabase → **SQL Editor** → cole o SQL abaixo e execute:

```sql
alter table public.leads
  add column optin_whatsapp boolean not null default false,
  add column optin_at timestamptz;

drop policy "anyone can insert leads" on public.leads;

create policy "anyone can insert leads"
on public.leads
for insert
to anon, authenticated
with check (
  char_length(nome) between 2 and 100
  and char_length(whatsapp) between 8 and 25
  and char_length(email) between 5 and 255
  and colaboradores in ('ate_5','5_10','10_20','20_50','50_100','acima_100')
  and optin_whatsapp = true
  and optin_at is not null
);

create index leads_optin_at_idx on public.leads (optin_at desc) where optin_whatsapp = true;
```

### 3. Substituir os placeholders `[BRACKETS]` nas 4 páginas HTML

Em **index.html**, **obrigado.html**, **politica-de-privacidade.html** e **termos-de-uso.html**, busque por colchetes (`Ctrl+F` no editor) e substitua pelos valores reais:

- `[RAZÃO SOCIAL LTDA]` → razão social da empresa
- `[00.000.000/0001-00]` → CNPJ
- `[Rua Exemplo, 123, Bairro, Cidade/UF, CEP 00000-000]` → endereço
- `[contato@cristianooliveira.com.br]` → e-mail de contato
- `[dpo@cristianooliveira.com.br]` → e-mail do DPO (encarregado LGPD)
- `[+55 (11) 90000-0000]` → telefone exibido
- `[https://wa.me/5511900000000]` → link clicável do WhatsApp (sem espaços, com DDI)

Em **obrigado.html**, substituir a URL do Calendly (`https://calendly.com/cristianooliveira/sessao`) pelo seu link real.

---

## 🚀 Como subir na Hostinger

1. Login no **hPanel** da Hostinger
2. Menu lateral → **Arquivos** → **Gerenciador de Arquivos**
3. Entre na pasta `public_html/` (apague o `default.html` se existir lá)
4. Arrasta TODOS os arquivos do `site/` para dentro de `public_html/`
   - **Incluindo** o `.htaccess` (alguns sistemas escondem arquivos que começam com `.` — ative "Mostrar arquivos ocultos" no gerenciador)
   - **Incluindo** a pasta `assets/`
5. Pronto. Acesse `https://cristianooliveira.com.br/` e o site está no ar.

Tempo total: 2 minutos.

---

## 🧪 Como testar antes de subir

Não precisa de servidor. Abra qualquer terminal na pasta `site/` e rode:

```bash
python3 -m http.server 8000
```

Aí abre `http://localhost:8000` no navegador. Pra testar o formulário de verdade, configure o Supabase primeiro (passos 1 e 2 acima).

---

## 🔄 Como atualizar o site depois

Abre qualquer arquivo `.html` em um editor de texto (até o Bloco de Notas), edita o que quiser, salva, sobe de novo pela Hostinger. **Sem build, sem deploy pipeline, sem CI/CD.**

---

## 📋 Conformidade Meta / WhatsApp Cloud API

O site já atende todos os requisitos para verificação:

- ✅ Política de Privacidade com 12 seções LGPD
- ✅ Termos de Uso
- ✅ Footer com razão social, CNPJ, endereço, e-mails
- ✅ Checkbox de opt-in **obrigatória e não pré-marcada**
- ✅ Consentimento gravado no banco (`optin_whatsapp` + `optin_at`)
- ✅ Política RLS exige `optin_whatsapp = true`
- ✅ HTML `lang="pt-BR"`, OG image 1200×630, metatags PT-BR
- ✅ `noindex` em `/obrigado.html`

### Fora do código (manual, no Meta Business):
1. Verificar empresa no Meta Business Manager (CNPJ + documentos)
2. Cadastrar número dedicado no WhatsApp Cloud API
3. Submeter templates de mensagem (categoria "utilidade" para entrega do e-book)
4. Configurar integração de envio (ex: via n8n, Make, Zapier ou função do Supabase)

---

## Licença

Propriedade de Cristiano Oliveira. Todos os direitos reservados.
