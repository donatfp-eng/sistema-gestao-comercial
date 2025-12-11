--
-- PostgreSQL database dump
--

\restrict PMjC2XcuouuyypxMyq3n19eUQ2teiG2oHa5coiR1b88CrKLoCp2Us8QaKcQ6ZV4

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    cpf_cnpj character varying(20),
    email character varying(255),
    telefone character varying(20),
    whatsapp character varying(20),
    endereco_rua character varying(255),
    endereco_numero character varying(20),
    endereco_complemento character varying(255),
    endereco_bairro character varying(100),
    endereco_cidade character varying(100),
    endereco_estado character varying(2),
    endereco_cep character varying(10),
    observacoes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cnpj character varying(50),
    percentual_comissao numeric(5,2) DEFAULT 0,
    ativo boolean DEFAULT true
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: clientes_finais; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes_finais (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    cpf_cnpj character varying(20),
    email character varying(255),
    telefone character varying(20),
    whatsapp character varying(20),
    endereco_rua character varying(255),
    endereco_numero character varying(20),
    endereco_complemento character varying(255),
    endereco_bairro character varying(100),
    endereco_cidade character varying(100),
    endereco_estado character varying(2),
    endereco_cep character varying(10),
    cliente_primario_id integer,
    observacoes text,
    status_contato character varying(50) DEFAULT 'não_contatado'::character varying,
    observacoes_contato text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    etapa_funil character varying(50) DEFAULT 'novo'::character varying,
    vendedor_id integer,
    valor_potencial numeric(12,2) DEFAULT 0,
    data_followup timestamp without time zone,
    ultima_interacao timestamp without time zone,
    motivo_perda text,
    origem character varying(100),
    temperatura character varying(20) DEFAULT 'morno'::character varying,
    no_answer_streak integer DEFAULT 0,
    last_stage_change_at timestamp without time zone,
    melhor_horario character varying(20),
    canal_preferido character varying(20) DEFAULT 'ligacao'::character varying,
    ultimo_horario_atendeu character varying(5),
    codigo character varying(50),
    prioridade character varying(20) DEFAULT 'medium'::character varying,
    tags text DEFAULT '[]'::text,
    status character varying(50) DEFAULT 'novo'::character varying,
    data_primeiro_contato timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clientes_finais OWNER TO postgres;

--
-- Name: clientes_finais_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_finais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_finais_id_seq OWNER TO postgres;

--
-- Name: clientes_finais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_finais_id_seq OWNED BY public.clientes_finais.id;


--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clientes_id_seq OWNER TO postgres;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: equipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipes (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.equipes OWNER TO postgres;

--
-- Name: equipes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipes_id_seq OWNER TO postgres;

--
-- Name: equipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipes_id_seq OWNED BY public.equipes.id;


--
-- Name: historico_ligacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.historico_ligacoes (
    id integer NOT NULL,
    lead_id integer,
    telefone character varying(20),
    tipo character varying(10) DEFAULT 'saida'::character varying,
    duracao integer DEFAULT 0,
    status character varying(50),
    gravacao_url text,
    gravacao_local text,
    data_ligacao timestamp without time zone,
    usuario_id integer,
    notas text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    net2phone_id character varying(100),
    gravacao_id character varying(100),
    usuario_net2phone character varying(200)
);


ALTER TABLE public.historico_ligacoes OWNER TO postgres;

--
-- Name: historico_ligacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.historico_ligacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historico_ligacoes_id_seq OWNER TO postgres;

--
-- Name: historico_ligacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.historico_ligacoes_id_seq OWNED BY public.historico_ligacoes.id;


--
-- Name: ligacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ligacoes (
    id integer NOT NULL,
    data timestamp without time zone NOT NULL,
    cliente_id integer,
    vendedor_id integer,
    status character varying(50),
    observacoes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cliente_final_id integer,
    duracao integer DEFAULT 0,
    cliente_nome character varying(255),
    vendedor_nome character varying(255)
);


ALTER TABLE public.ligacoes OWNER TO postgres;

--
-- Name: ligacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ligacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ligacoes_id_seq OWNER TO postgres;

--
-- Name: ligacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ligacoes_id_seq OWNED BY public.ligacoes.id;


--
-- Name: metas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metas (
    id integer NOT NULL,
    vendedor_id integer,
    tipo character varying(50) NOT NULL,
    periodo character varying(50) NOT NULL,
    valor_meta numeric(10,2),
    mes integer,
    ano integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.metas OWNER TO postgres;

--
-- Name: metas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metas_id_seq OWNER TO postgres;

--
-- Name: metas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metas_id_seq OWNED BY public.metas.id;


--
-- Name: metas_lista; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metas_lista (
    id integer NOT NULL,
    vendedor_id integer,
    cliente_primario_id integer,
    data_lote date NOT NULL,
    qtd_leads integer DEFAULT 0,
    valor_leads numeric(12,2) DEFAULT 0,
    meta_valor numeric(12,2) DEFAULT 0,
    meta_qtd integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    meta_ligacoes integer DEFAULT 0
);


ALTER TABLE public.metas_lista OWNER TO postgres;

--
-- Name: metas_lista_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metas_lista_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metas_lista_id_seq OWNER TO postgres;

--
-- Name: metas_lista_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metas_lista_id_seq OWNED BY public.metas_lista.id;


--
-- Name: metas_vendedor_cliente; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metas_vendedor_cliente (
    id integer NOT NULL,
    vendedor_id integer,
    cliente_primario_id integer,
    mes integer NOT NULL,
    ano integer NOT NULL,
    meta_doacoes integer DEFAULT 0,
    meta_valor numeric(10,2) DEFAULT 0,
    meta_ligacoes integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.metas_vendedor_cliente OWNER TO postgres;

--
-- Name: metas_vendedor_cliente_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metas_vendedor_cliente_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metas_vendedor_cliente_id_seq OWNER TO postgres;

--
-- Name: metas_vendedor_cliente_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metas_vendedor_cliente_id_seq OWNED BY public.metas_vendedor_cliente.id;


--
-- Name: propostas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.propostas (
    id integer NOT NULL,
    titulo character varying(255),
    cliente_id integer,
    vendedor_id integer,
    valor_total numeric(15,2) DEFAULT 0,
    status character varying(50) DEFAULT 'rascunho'::character varying,
    data_criacao timestamp without time zone DEFAULT now(),
    observacoes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.propostas OWNER TO postgres;

--
-- Name: propostas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.propostas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.propostas_id_seq OWNER TO postgres;

--
-- Name: propostas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.propostas_id_seq OWNED BY public.propostas.id;


--
-- Name: tarefas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tarefas (
    id integer NOT NULL,
    lead_id integer,
    usuario_id integer,
    tipo character varying(50) DEFAULT 'outro'::character varying NOT NULL,
    descricao text NOT NULL,
    data_vencimento timestamp without time zone,
    prioridade character varying(20) DEFAULT 'normal'::character varying,
    status character varying(20) DEFAULT 'pendente'::character varying,
    automatica boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    concluida_at timestamp without time zone
);


ALTER TABLE public.tarefas OWNER TO postgres;

--
-- Name: tarefas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tarefas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tarefas_id_seq OWNER TO postgres;

--
-- Name: tarefas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tarefas_id_seq OWNED BY public.tarefas.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    senha character varying(255) NOT NULL,
    tipo character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    perfil character varying(50) DEFAULT 'vendedor'::character varying,
    status character varying(20) DEFAULT 'ativo'::character varying
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vendas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendas (
    id integer NOT NULL,
    data date NOT NULL,
    cliente_id integer,
    cliente_final_id integer,
    vendedor_id integer,
    valor_bruto numeric(10,2),
    valor_comissao numeric(10,2),
    valor_liquido numeric(10,2),
    observacoes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    faturada boolean DEFAULT false,
    cliente_nome character varying(255),
    vendedor_nome character varying(255),
    tipo character varying(30) DEFAULT 'venda'::character varying,
    forma_pagamento character varying(30),
    parcelas integer DEFAULT 1,
    valor_parcela numeric(10,2),
    juros_tipo character varying(20),
    juros_percentual numeric(5,2),
    recorrente boolean DEFAULT false,
    dia_cobranca integer,
    duracao_meses integer,
    produto character varying(255),
    status_pagamento character varying(20) DEFAULT 'pendente'::character varying,
    data_vencimento date,
    recibo_enviado boolean DEFAULT false
);


ALTER TABLE public.vendas OWNER TO postgres;

--
-- Name: COLUMN vendas.tipo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vendas.tipo IS 'venda, doacao_unica, doacao_recorrente, rifa';


--
-- Name: COLUMN vendas.forma_pagamento; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vendas.forma_pagamento IS 'pix, cartao_credito, cartao_debito, boleto, dinheiro, transferencia';


--
-- Name: COLUMN vendas.juros_tipo; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vendas.juros_tipo IS 'simples, composto';


--
-- Name: COLUMN vendas.status_pagamento; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.vendas.status_pagamento IS 'pendente, pago, cancelado, atrasado';


--
-- Name: vendas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendas_id_seq OWNER TO postgres;

--
-- Name: vendas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendas_id_seq OWNED BY public.vendas.id;


--
-- Name: vendedores; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vendedores (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    email character varying(255),
    telefone character varying(20),
    comissao_percentual numeric(5,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    equipe_id integer,
    usuario_id integer,
    meta_mensal numeric(10,2) DEFAULT 0,
    ativo boolean DEFAULT true
);


ALTER TABLE public.vendedores OWNER TO postgres;

--
-- Name: vendedores_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vendedores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendedores_id_seq OWNER TO postgres;

--
-- Name: vendedores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vendedores_id_seq OWNED BY public.vendedores.id;


--
-- Name: whatsapp_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_config (
    id integer NOT NULL,
    instance_id character varying(100),
    token character varying(255),
    client_token character varying(255),
    status character varying(20) DEFAULT 'desconectado'::character varying,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.whatsapp_config OWNER TO postgres;

--
-- Name: whatsapp_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_config_id_seq OWNER TO postgres;

--
-- Name: whatsapp_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_config_id_seq OWNED BY public.whatsapp_config.id;


--
-- Name: whatsapp_instancias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_instancias (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    telefone character varying(20),
    instance_id character varying(100) NOT NULL,
    token character varying(100) NOT NULL,
    client_token character varying(100),
    status character varying(20) DEFAULT 'desconectado'::character varying,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.whatsapp_instancias OWNER TO postgres;

--
-- Name: whatsapp_instancias_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_instancias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_instancias_id_seq OWNER TO postgres;

--
-- Name: whatsapp_instancias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_instancias_id_seq OWNED BY public.whatsapp_instancias.id;


--
-- Name: whatsapp_mensagens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_mensagens (
    id integer NOT NULL,
    message_id character varying(100),
    telefone character varying(100) NOT NULL,
    nome_contato character varying(255),
    mensagem text,
    tipo character varying(20) DEFAULT 'text'::character varying,
    direcao character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'enviada'::character varying,
    lead_id integer,
    vendedor_id integer,
    arquivo_url text,
    arquivo_nome character varying(255),
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'::text),
    lida boolean DEFAULT false,
    is_grupo boolean DEFAULT false,
    nome_grupo character varying(255),
    nome_remetente character varying(255)
);


ALTER TABLE public.whatsapp_mensagens OWNER TO postgres;

--
-- Name: whatsapp_mensagens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_mensagens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_mensagens_id_seq OWNER TO postgres;

--
-- Name: whatsapp_mensagens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_mensagens_id_seq OWNED BY public.whatsapp_mensagens.id;


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: clientes_finais id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes_finais ALTER COLUMN id SET DEFAULT nextval('public.clientes_finais_id_seq'::regclass);


--
-- Name: equipes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipes ALTER COLUMN id SET DEFAULT nextval('public.equipes_id_seq'::regclass);


--
-- Name: historico_ligacoes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_ligacoes ALTER COLUMN id SET DEFAULT nextval('public.historico_ligacoes_id_seq'::regclass);


--
-- Name: ligacoes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ligacoes ALTER COLUMN id SET DEFAULT nextval('public.ligacoes_id_seq'::regclass);


--
-- Name: metas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas ALTER COLUMN id SET DEFAULT nextval('public.metas_id_seq'::regclass);


--
-- Name: metas_lista id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_lista ALTER COLUMN id SET DEFAULT nextval('public.metas_lista_id_seq'::regclass);


--
-- Name: metas_vendedor_cliente id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_vendedor_cliente ALTER COLUMN id SET DEFAULT nextval('public.metas_vendedor_cliente_id_seq'::regclass);


--
-- Name: propostas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.propostas ALTER COLUMN id SET DEFAULT nextval('public.propostas_id_seq'::regclass);


--
-- Name: tarefas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tarefas ALTER COLUMN id SET DEFAULT nextval('public.tarefas_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Name: vendas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendas ALTER COLUMN id SET DEFAULT nextval('public.vendas_id_seq'::regclass);


--
-- Name: vendedores id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendedores ALTER COLUMN id SET DEFAULT nextval('public.vendedores_id_seq'::regclass);


--
-- Name: whatsapp_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_config ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_config_id_seq'::regclass);


--
-- Name: whatsapp_instancias id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_instancias ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_instancias_id_seq'::regclass);


--
-- Name: whatsapp_mensagens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_mensagens ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_mensagens_id_seq'::regclass);


--
-- Name: clientes_finais clientes_finais_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes_finais
    ADD CONSTRAINT clientes_finais_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: equipes equipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipes
    ADD CONSTRAINT equipes_pkey PRIMARY KEY (id);


--
-- Name: historico_ligacoes historico_ligacoes_net2phone_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_ligacoes
    ADD CONSTRAINT historico_ligacoes_net2phone_id_key UNIQUE (net2phone_id);


--
-- Name: historico_ligacoes historico_ligacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_ligacoes
    ADD CONSTRAINT historico_ligacoes_pkey PRIMARY KEY (id);


--
-- Name: ligacoes ligacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ligacoes
    ADD CONSTRAINT ligacoes_pkey PRIMARY KEY (id);


--
-- Name: metas_lista metas_lista_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_lista
    ADD CONSTRAINT metas_lista_pkey PRIMARY KEY (id);


--
-- Name: metas_lista metas_lista_vendedor_id_cliente_primario_id_data_lote_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_lista
    ADD CONSTRAINT metas_lista_vendedor_id_cliente_primario_id_data_lote_key UNIQUE (vendedor_id, cliente_primario_id, data_lote);


--
-- Name: metas metas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_pkey PRIMARY KEY (id);


--
-- Name: metas_vendedor_cliente metas_vendedor_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_vendedor_cliente
    ADD CONSTRAINT metas_vendedor_cliente_pkey PRIMARY KEY (id);


--
-- Name: metas_vendedor_cliente metas_vendedor_cliente_vendedor_id_cliente_primario_id_mes__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_vendedor_cliente
    ADD CONSTRAINT metas_vendedor_cliente_vendedor_id_cliente_primario_id_mes__key UNIQUE (vendedor_id, cliente_primario_id, mes, ano);


--
-- Name: propostas propostas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_pkey PRIMARY KEY (id);


--
-- Name: tarefas tarefas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tarefas
    ADD CONSTRAINT tarefas_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: vendas vendas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendas
    ADD CONSTRAINT vendas_pkey PRIMARY KEY (id);


--
-- Name: vendedores vendedores_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_config whatsapp_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_config
    ADD CONSTRAINT whatsapp_config_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_instancias whatsapp_instancias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_instancias
    ADD CONSTRAINT whatsapp_instancias_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_mensagens whatsapp_mensagens_message_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_mensagens
    ADD CONSTRAINT whatsapp_mensagens_message_id_key UNIQUE (message_id);


--
-- Name: whatsapp_mensagens whatsapp_mensagens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_mensagens
    ADD CONSTRAINT whatsapp_mensagens_pkey PRIMARY KEY (id);


--
-- Name: idx_clientes_finais_codigo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_clientes_finais_codigo ON public.clientes_finais USING btree (codigo) WHERE (codigo IS NOT NULL);


--
-- Name: idx_clientes_finais_email_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_finais_email_cliente ON public.clientes_finais USING btree (email, cliente_primario_id) WHERE ((email IS NOT NULL) AND ((email)::text <> ''::text));


--
-- Name: idx_clientes_finais_telefone_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clientes_finais_telefone_cliente ON public.clientes_finais USING btree (telefone, cliente_primario_id) WHERE ((telefone IS NOT NULL) AND ((telefone)::text <> ''::text));


--
-- Name: idx_metas_cliente; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_metas_cliente ON public.metas_vendedor_cliente USING btree (cliente_primario_id);


--
-- Name: idx_metas_periodo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_metas_periodo ON public.metas_vendedor_cliente USING btree (mes, ano);


--
-- Name: idx_metas_vendedor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_metas_vendedor ON public.metas_vendedor_cliente USING btree (vendedor_id);


--
-- Name: idx_tarefas_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tarefas_data ON public.tarefas USING btree (data_vencimento);


--
-- Name: idx_tarefas_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tarefas_status ON public.tarefas USING btree (status);


--
-- Name: idx_tarefas_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tarefas_usuario ON public.tarefas USING btree (usuario_id);


--
-- Name: idx_whatsapp_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_created ON public.whatsapp_mensagens USING btree (created_at DESC);


--
-- Name: idx_whatsapp_lead; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_lead ON public.whatsapp_mensagens USING btree (lead_id);


--
-- Name: idx_whatsapp_telefone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_telefone ON public.whatsapp_mensagens USING btree (telefone);


--
-- Name: idx_whatsapp_vendedor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_whatsapp_vendedor ON public.whatsapp_mensagens USING btree (vendedor_id);


--
-- Name: clientes_finais clientes_finais_cliente_primario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes_finais
    ADD CONSTRAINT clientes_finais_cliente_primario_id_fkey FOREIGN KEY (cliente_primario_id) REFERENCES public.clientes(id);


--
-- Name: historico_ligacoes historico_ligacoes_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.historico_ligacoes
    ADD CONSTRAINT historico_ligacoes_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.clientes_finais(id) ON DELETE SET NULL;


--
-- Name: ligacoes ligacoes_cliente_final_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ligacoes
    ADD CONSTRAINT ligacoes_cliente_final_id_fkey FOREIGN KEY (cliente_final_id) REFERENCES public.clientes_finais(id);


--
-- Name: ligacoes ligacoes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ligacoes
    ADD CONSTRAINT ligacoes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: metas_lista metas_lista_cliente_primario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_lista
    ADD CONSTRAINT metas_lista_cliente_primario_id_fkey FOREIGN KEY (cliente_primario_id) REFERENCES public.clientes(id);


--
-- Name: metas_lista metas_lista_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_lista
    ADD CONSTRAINT metas_lista_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);


--
-- Name: metas_vendedor_cliente metas_vendedor_cliente_cliente_primario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_vendedor_cliente
    ADD CONSTRAINT metas_vendedor_cliente_cliente_primario_id_fkey FOREIGN KEY (cliente_primario_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: metas_vendedor_cliente metas_vendedor_cliente_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_vendedor_cliente
    ADD CONSTRAINT metas_vendedor_cliente_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE CASCADE;


--
-- Name: metas metas_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);


--
-- Name: propostas propostas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: propostas propostas_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.propostas
    ADD CONSTRAINT propostas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);


--
-- Name: tarefas tarefas_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tarefas
    ADD CONSTRAINT tarefas_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.clientes_finais(id);


--
-- Name: vendas vendas_cliente_final_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendas
    ADD CONSTRAINT vendas_cliente_final_id_fkey FOREIGN KEY (cliente_final_id) REFERENCES public.clientes_finais(id);


--
-- Name: vendas vendas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendas
    ADD CONSTRAINT vendas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);


--
-- Name: vendas vendas_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendas
    ADD CONSTRAINT vendas_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);


--
-- Name: vendedores vendedores_equipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.equipes(id);


--
-- Name: vendedores vendedores_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vendedores
    ADD CONSTRAINT vendedores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: whatsapp_mensagens whatsapp_mensagens_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_mensagens
    ADD CONSTRAINT whatsapp_mensagens_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.clientes_finais(id);


--
-- Name: whatsapp_mensagens whatsapp_mensagens_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_mensagens
    ADD CONSTRAINT whatsapp_mensagens_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id);


--
-- Name: TABLE clientes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clientes TO gestao_user;


--
-- Name: TABLE clientes_finais; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clientes_finais TO gestao_user;


--
-- Name: SEQUENCE clientes_finais_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.clientes_finais_id_seq TO gestao_user;


--
-- Name: SEQUENCE clientes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.clientes_id_seq TO gestao_user;


--
-- Name: TABLE equipes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.equipes TO gestao_user;


--
-- Name: SEQUENCE equipes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.equipes_id_seq TO gestao_user;


--
-- Name: TABLE historico_ligacoes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.historico_ligacoes TO gestao_user;


--
-- Name: SEQUENCE historico_ligacoes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.historico_ligacoes_id_seq TO gestao_user;


--
-- Name: TABLE ligacoes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ligacoes TO gestao_user;


--
-- Name: SEQUENCE ligacoes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ligacoes_id_seq TO gestao_user;


--
-- Name: TABLE metas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.metas TO gestao_user;


--
-- Name: SEQUENCE metas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.metas_id_seq TO gestao_user;


--
-- Name: TABLE metas_lista; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.metas_lista TO gestao_user;


--
-- Name: SEQUENCE metas_lista_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.metas_lista_id_seq TO gestao_user;


--
-- Name: TABLE metas_vendedor_cliente; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.metas_vendedor_cliente TO gestao_user;


--
-- Name: SEQUENCE metas_vendedor_cliente_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.metas_vendedor_cliente_id_seq TO gestao_user;


--
-- Name: TABLE propostas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.propostas TO gestao_user;


--
-- Name: SEQUENCE propostas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.propostas_id_seq TO gestao_user;


--
-- Name: TABLE tarefas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tarefas TO gestao_user;


--
-- Name: SEQUENCE tarefas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tarefas_id_seq TO gestao_user;


--
-- Name: TABLE usuarios; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usuarios TO gestao_user;


--
-- Name: SEQUENCE usuarios_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.usuarios_id_seq TO gestao_user;


--
-- Name: TABLE vendas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendas TO gestao_user;


--
-- Name: SEQUENCE vendas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.vendas_id_seq TO gestao_user;


--
-- Name: TABLE vendedores; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.vendedores TO gestao_user;


--
-- Name: SEQUENCE vendedores_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.vendedores_id_seq TO gestao_user;


--
-- Name: TABLE whatsapp_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.whatsapp_config TO gestao_user;


--
-- Name: SEQUENCE whatsapp_config_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.whatsapp_config_id_seq TO gestao_user;


--
-- Name: TABLE whatsapp_instancias; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.whatsapp_instancias TO gestao_user;


--
-- Name: SEQUENCE whatsapp_instancias_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.whatsapp_instancias_id_seq TO gestao_user;


--
-- Name: TABLE whatsapp_mensagens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.whatsapp_mensagens TO gestao_user;


--
-- Name: SEQUENCE whatsapp_mensagens_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.whatsapp_mensagens_id_seq TO gestao_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO gestao_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO gestao_user;


--
-- PostgreSQL database dump complete
--

\unrestrict PMjC2XcuouuyypxMyq3n19eUQ2teiG2oHa5coiR1b88CrKLoCp2Us8QaKcQ6ZV4

