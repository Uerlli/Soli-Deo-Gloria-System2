# Café Soli Deo Gloria — Sistema de Gestão de Estoque, Vendas e PDV

## 1. Project Description

Sistema web interno para o **Café Soli Deo Gloria**, usado por administradores e atendentes no balcão. O objetivo é controlar vendas (PDV), estoque, usuários e operação diária, com uma identidade visual própria que une "café artesanal" e "software profissional".

- **Público-alvo:** administrador do café e atendentes do balcão.
- **Valor central:** vender café rápido, com controle confiável de estoque e permissões reais por papel (Admin × Atendente).

## 2. Page Structure

- `/login` — Tela de login (identidade da marca + formulário)
- `/pdv` — Ponto de Venda (catálogo + "Sistema de Pedidos" + pagamento)
- `/balcao` — Balcão de Preparo / KDS (fila de pedidos em tempo real vinda da Moderninha Smart 2)
- `/estoque` — Gestão de Estoque & Insumos (KPIs, tabela, entradas, perdas, extrato)
- `/comandas` — Comandas (pedidos marcados como comanda, agrupados por cliente, total acumulado e finalização com pagamento)
- `/vendas` — Histórico de vendas (somente Admin para financeiro)
- `/relatorios` — Relatórios (somente Admin)
- `/usuarios` — Gestão de usuários (somente Admin)
- `/configuracoes` — Configurações (somente Admin)
- `/caixa` — Fechamento de caixa (somente Admin)
- `/` — Redireciona para `/login` ou `/pdv` conforme sessão

## 3. Core Features

- [ ] Autenticação com Supabase Auth (login/logout, sessão persistente)
- [ ] Papéis de usuário (admin / attendant) com permissões verificadas no banco (RLS)
- [ ] Estrutura de navegação lateral filtrada por papel
- [ ] PDV: catálogo com busca e filtros por categoria
- [ ] PDV: carrinho com quantidade, remoção e total
- [ ] Checkout: Dinheiro (com troco), Pix (pending), Cartão (PagBank Smart2 externo)
- [ ] Baixa de estoque ao confirmar venda paga
- [ ] Alerta visual de estoque baixo / esgotado
- [ ] Histórico de vendas e detalhe da venda (Admin)
- [ ] Fechamento de caixa (Admin)
- [ ] Relatórios: mais vendidos, margem de lucro, vendas por período (Admin)
- [x] KDS: fila de preparo em tempo real (Supabase Realtime)
- [x] KDS: Kanban por status (Aguardando / Em preparo / Prontos)
- [x] KDS: timer por pedido com código de cores (5 / 15 minutos)
- [x] KDS: alerta sonoro (Web Audio API) com botão de ativação
- [x] KDS: painel de simulação de venda da Moderninha Smart 2
- [x] Ingestão de pedidos via Edge Function (webhook PagBank) + RPC atômica com baixa de estoque
- [x] Estoque: dashboard de KPIs (total, disponíveis, baixo, esgotados, valor em estoque)
- [x] Estoque: tabela de saldos com busca, filtros por categoria e status, ações rápidas
- [x] Estoque: Entrada de mercadoria (restock) com média ponderada de custo
- [x] Estoque: registro de perdas/avarias/validade/consumo interno e ajuste de inventário
- [x] Estoque: extrato auditável de movimentações (livro-razão) em tempo real
- [x] Estoque: alerta em tempo real quando uma venda derruba o saldo para baixo/esgotado
- [x] Estoque: configuração de mínimo de alerta, custo e preço (admin)
- [x] PDV: "Sistema de Pedidos" (carrinho movido do simulador) gravando vendas reais (source `pdv`)
- [x] PDV: clique no produto abre o carrinho com o item já adicionado
- [x] PDV: cartões sem a quantidade em estoque (mantendo a etiqueta de status)
- [x] Forma de pagamento (Dinheiro / Pix / Cartão) na finalização do pedido
- [x] Cancelamento de pedido (hover no desktop, sempre visível no mobile/tablet) com devolução de estoque
- [x] Estoque: cadastro de produto novo dentro do modal de entrada de mercadoria (ícone "+", admin)
- [x] Produtos: flag "entrega imediata no caixa" (só Água, Água com gás, Refri lata, Schweppes e Kombucha; os demais entram na fila)
- [x] Comandas: agrupamento por cliente, total acumulado por rodadas e finalização com pagamento
- [x] Pedido: campo Cliente obrigatório + opção "Criar comanda" com sugestão de comanda aberta por nome parecido
- [x] Balcão: itens de "entrega imediata" com botão "Entregue" (não afetam a coluna do bloco)
- [x] Balcão: pedido só com itens de entrega imediata nasce em "Prontos para entrega"
- [x] Balcão: cancelamento de item individual devolvendo estoque (nunca o que já foi entregue) e encerramento automático quando só sobram itens entregues
- [x] Simulador da maquininha restrito ao administrador, com selo de teste

## 4. Data Model Design

> Todos os valores monetários usam `numeric(12,2)` para evitar erro de ponto flutuante.

### Table: users
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK, referencia `auth.users(id)` |
| name | text | Nome do usuário |
| email | text | Email |
| role | text | `admin` ou `attendant` |
| active | boolean | Usuário ativo |
| created_at | timestamptz | Data de criação |

### Table: products
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| name | text | Nome do produto |
| category | text | Categoria (Cafés, New Drinks, Bebidas, Gelados, Novidades, Salgados, Tortas e Doces, Bolos) |
| unit | text | unidade / kg / g / litro / ml |
| current_stock | numeric | Estoque atual |
| minimum_stock | numeric | Estoque mínimo (alerta) |
| unit_cost | numeric | Custo unitário |
| price | numeric | Preço de venda |
| active | boolean | Produto ativo |
| requires_preparation | boolean | Flag técnica de fila. `false` = "entrega imediata no caixa" (não passa pela fila); `true` = passa pela fila de preparo do Balcão |
| created_at | timestamptz | Criado em |
| updated_at | timestamptz | Atualizado em |

### Table: stock_entries
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| product_id | uuid | FK products |
| quantity | numeric | Quantidade entrada |
| unit_cost | numeric | Custo unitário |
| total_cost | numeric | Custo total |
| created_by | uuid | FK users |
| created_at | timestamptz | Data |

### Table: stock_movements (extrato / livro-razão de estoque)
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| product_id | uuid | FK products (on delete cascade) |
| movement_type | stock_movement_type (enum) | `ENTRY` / `SALE_DEDUCTION` / `WASTE` / `INTERNAL_CONSUMPTION` / `ADJUSTMENT` / `ORDER_CANCELLATION` |
| quantity | numeric(12,2) | Magnitude movimentada |
| previous_stock | numeric(12,2) | Saldo antes |
| new_stock | numeric(12,2) | Saldo depois |
| unit_cost | numeric(12,2) | Custo no momento |
| reason | text | Motivo / origem (ex: Nota Fiscal, Validade vencida) |
| notes | text | Observações detalhadas |
| order_id | uuid | FK orders (on delete set null), quando a baixa vem de venda |
| created_by | uuid | Operador (auth.uid) |
| created_at | timestamptz | Data |

### Table: sales
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| seller_id | uuid | FK users |
| total_amount | numeric | Valor total |
| payment_method | text | `cash` / `pix` / `card` |
| status | text | `pending` / `paid` / `cancelled` |
| created_at | timestamptz | Data |

### Table: sale_items
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| sale_id | uuid | FK sales |
| product_id | uuid | FK products |
| quantity | numeric | Quantidade |
| unit_price | numeric | Preço unitário no momento da venda |
| unit_cost | numeric | Custo no momento da venda (histórico) |
| subtotal | numeric | Subtotal |

### Table: orders (KDS — pedidos do balcão)
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| external_id | text | Código da transação vindo do PagBank (idempotência) |
| order_number | text | Número da comanda/ficha |
| table_identifier | text | Legado (mesa/identificação) — não é mais usado pelo formulário atual |
| customer_name | text | Nome do cliente (obrigatório no formulário atual) |
| status | order_status (enum) | `PENDING` / `PREPARING` / `READY` / `DELIVERED` / `CANCELLED` |
| total_amount | numeric(12,2) | Valor total |
| notes | text | Observações gerais do pedido |
| source | text | Origem (`pagbank` / `pdv` / `simulator`) |
| payment_method | text | `cash` / `pix` / `card` (definido na entrega/finalização) |
| create_comanda | boolean | `true` = pedido pertence a uma comanda que acumula rodadas |
| created_at | timestamptz | Recebido em |
| updated_at | timestamptz | Atualizado em |

### Table: order_items (itens do pedido)
| Field | Type | Description |
|-------|------|-------------|
| id | uuid | PK |
| order_id | uuid | FK orders (on delete cascade) |
| product_id | uuid | FK products (opcional, on delete set null) |
| product_name | text | Nome do item como veio da maquininha |
| quantity | integer | Quantidade |
| unit_price | numeric(12,2) | Preço unitário |
| notes | text | Observação/customização do item |
| requires_preparation | boolean | Snapshot no momento do pedido: `false` = entrega imediata no caixa |
| delivered | boolean | Item já entregue ao cliente (não devolve estoque ao cancelar) |
| cancelled | boolean | Item cancelado individualmente dentro do pedido |

### Função: ingest_order(p_payload jsonb)
`SECURITY DEFINER` — grava pedido + itens atomicamente, resolve `product_id` por nome quando não vem UUID, dá baixa no estoque (registrando `SALE_DEDUCTION` em `stock_movements`) e evita duplicidade por `external_id`. Usada tanto pelo webhook quanto pelo simulador e pelo PDV. Grava `payment_method` e `create_comanda` quando enviados. Define o status inicial como `READY` (pronto) quando nenhum item exige preparo; caso contrário `PENDING`. Grava o snapshot de `requires_preparation` por item. O motivo no extrato diferencia "Venda no PDV", "Venda Moderninha" e "Venda simulada (teste)".

### Função: register_stock_movement(p_product_id, p_type, p_quantity, p_reason, p_notes, p_unit_cost, p_order_id)
`SECURITY DEFINER` — movimenta o estoque de forma **atômica** (lock `FOR UPDATE`) e grava a linha no extrato. Entrada recalcula o **custo médio ponderado** quando vem o custo do lote. Liberada para `admin` e `attendant` (o custo/preço não são alterados aqui).

### Função: update_product_settings(p_product_id, p_minimum_stock, p_unit_cost, p_price, p_requires_preparation)
`SECURITY DEFINER` — ajusta limite de alerta, custo, preço e a flag "precisa de preparo". Restrita a `admin`.

### Função: cancel_order(p_order_id uuid)
`SECURITY DEFINER` — cancela um pedido ainda em `PENDING` / `PREPARING` / `READY`, devolve atomicamente ao estoque a quantidade de cada item **ainda não entregue** (lock `FOR UPDATE`), marca os itens como cancelados e registra `ORDER_CANCELLATION` no extrato. Liberada para `admin`, `attendant` e `service_role`.

### Função: cancel_order_item(p_order_id uuid, p_item_id uuid)
`SECURITY DEFINER` — cancela um item individual ainda não entregue, devolvendo a quantidade ao estoque (`ORDER_CANCELLATION`, motivo "Cancelamento de item"). Nunca devolve itens já marcados como entregues. Recalcula o estado do pedido: se não sobrar item ativo → `CANCELLED`; se só sobrarem itens entregues → `DELIVERED` (sai do quadro ativo do Balcão); senão mantém. Liberada para `admin`, `attendant` e `service_role`.

### Função: set_order_item_delivered(p_item_id uuid, p_delivered boolean)
`SECURITY DEFINER` — marca/desmarca um item como entregue ao cliente (usado pelos itens de entrega imediata no Balcão). Não altera a coluna do pedido. Liberada para `admin`, `attendant` e `service_role`.

### Função: create_product(p_payload jsonb)
`SECURITY DEFINER` — cadastra um produto novo (nome, categoria, unidade, saldo inicial, custo, preço, mínimo e "precisa de preparo"). Quando o saldo inicial é maior que zero, grava a entrada inicial no extrato. Restrita a `admin`.

### Realtime
Publicação `supabase_realtime` habilitada em `products`, `stock_movements`, `orders` e `order_items`.

## 5. Backend / Third-party Integration Plan

- **Banco de dados:** SaaS Supabase (conectado). Auth + Postgres + RLS.
- **Shopify:** não necessário.
- **Stripe:** não necessário nesta fase (pagamentos via Pix/Cartão externo futuramente).
- **Outros:** integração Pix real (Mercado Pago / Efí / Asaas) fica para fase futura; nesta versão o Pix permanece em estado `pending` até confirmação manual/real.
- **PagBank / Moderninha Smart 2:** Edge Function `pagbank-webhook` recebe o POST do PagBank, normaliza o payload (centavos → reais, lista de itens, observações) e chama a RPC `ingest_order`. Realtime ativo em `orders` e `order_items`.
  - Cada item do pedido gera uma baixa `SALE_DEDUCTION` no extrato de estoque e dispara alertas no módulo `/estoque` quando o saldo cruza o mínimo.

## 6. Development Phase Plan

### Phase 1: Fundação + Identidade + Login
- Goal: Estruturar o banco (users, products, stock_entries, sales, sale_items), aplicar RLS por papel, e entregar a tela de Login com a identidade visual da marca.
- Deliverable: Banco criado + dados de demonstração + tela de login funcional + redirecionamento por papel.
- **Dados de demonstração:** catálogo real do Café Soli Deo Gloria (64 itens do cardápio, em 8 categorias), com estoques normais, baixos e zerados para testar todos os estados. Usuários de teste: `admin` / `atendente`.

### Phase 2: PDV (Catálogo + Carrinho)
- Goal: Tela de PDV com catálogo, busca, filtros por categoria e carrinho com controle de quantidade.
- Deliverable: PDV visualmente completo com estados de esgotado / estoque baixo.

### Phase 3: Checkout + Baixa de Estoque
- Goal: Fluxo de pagamento (Dinheiro/Pix/Cartão), confirmação da venda e baixa automática de estoque.
- Deliverable: Venda registrada no banco + estoque atualizado + tela de sucesso.

### Phase 4: Histórico + Fechamento + Relatórios
- Goal: Página de vendas, fechamento de caixa e relatórios (Admin).
- Deliverable: Histórico com detalhe, resumo de caixa e relatórios de mais vendidos/margem.

### Phase 6: Gestão de Estoque & Controle de Insumos
- Goal: Central de estoque com KPIs, tabela de saldos, entradas, perdas, extrato auditável e alertas em tempo real integrados ao PDV e à Moderninha Smart 2.
- Deliverable: Tela `/estoque` completa com módulos de restock, perda/ajuste, configuração de produto e gaveta de extrato.
- Banco: tabela `stock_movements` + enum `stock_movement_type`, RLS por papel, Realtime habilitado, RPCs `register_stock_movement` e `update_product_settings`, `ingest_order` registrando `SALE_DEDUCTION`.
- Permissões: movimentação de saldo (entrada/perda/ajuste) liberada para admin e atendente via RPC controlada; custo, preço e mínimo restritos ao admin; coluna de custo oculta para o atendente.

### Phase 7: Pedidos, Comandas e Entrega Imediata no Balcão
- Goal: Consolidar a tela de pedidos (Sistema de Pedidos do PDV + simulador de teste) e refinar o comportamento do Balcão (KDS) conforme o conteúdo de cada pedido.
- Deliverable:
  - Formulário: campo **Cliente obrigatório** e opção **Criar comanda** com sugestão de comanda aberta por nome parecido (ignora acentos e maiúsculas).
  - Produtos: flag renomeada para **"Entrega imediata no caixa"** (apenas Água, Água com gás, Refri lata, Schweppes e Kombucha marcados como sim).
  - Balcão: pedido com item de fila vira um bloco único decidido só pelos itens de fila; itens de entrega imediata ganham botão "Entregue" (não afetam a coluna); pedido só com itens imediatos nasce em "Prontos para entrega".
  - Cancelamento de item individual com devolução de estoque (nunca do entregue) e encerramento automático do bloco quando só restam itens entregues.
  - Simulador da maquininha liberado só para administrador, com indicação clara de teste.
- Banco: colunas `orders.create_comanda` e `order_items.requires_preparation/delivered/cancelled`; funções `cancel_order_item` e `set_order_item_delivered`; `ingest_order` e `cancel_order` revisadas.