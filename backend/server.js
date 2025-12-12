const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'seu-secret-super-seguro-aqui';
const NET2PHONE_API_KEY = '5K/+KzVpPgNBKTaimXqkg3dJ5HT7CT03wc5jI0uyHYTFhkmV0g63u2MK90L9CUJbEUSSl7YONqZL1vAYqIeLJw==';
const NET2PHONE_API_URL = 'https://api.n2p.io/v2';

const pool = new Pool({
    user: 'gestao_user',
    host: 'localhost',
    database: 'sistema_gestao',
    password: 'senha123',
    port: 5432,
});

app.use(cors());
app.use(express.json());

const auth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.senha);
        if (!validPassword) return res.status(401).json({ error: 'Credenciais inválidas' });
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '18250d' });
        const vendedorResult = await pool.query('SELECT id FROM vendedores WHERE usuario_id = $1', [user.id]); const vendedor_id = vendedorResult.rows.length > 0 ? vendedorResult.rows[0].id : null; res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, tipo: user.tipo, perfil: user.perfil, vendedor_id } });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// USUARIOS
app.get('/api/usuarios', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post("/api/usuarios", async (req, res) => { try { const { nome, email, senha, perfil, status } = req.body; const hashedPassword = await bcrypt.hash(senha, 10); const result = await pool.query("INSERT INTO usuarios (nome, email, senha, perfil, tipo, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [nome, email, hashedPassword, perfil || "vendedor", perfil || "vendedor", status || "ativo"]); const usuario = result.rows[0]; if (perfil === "vendedor" || !perfil) { await pool.query("INSERT INTO vendedores (nome, email, usuario_id, ativo) VALUES ($1, $2, $3, true)", [nome, email, usuario.id]); console.log("Vendedor criado automaticamente para usuario:", usuario.id); } res.status(201).json(usuario); } catch (error) { console.error("Erro ao criar usuario:", error); res.status(500).json({ error: error.message }); } });

app.put('/api/usuarios/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = Object.values(updates);
        await pool.query(`UPDATE usuarios SET ${fields} WHERE id = $1`, [id, ...values]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.delete('/api/usuarios/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir' });
    }
});

// CLIENTES
app.get('/api/clientes', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes WHERE ativo = true OR ativo IS NULL ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post('/api/clientes', auth, async (req, res) => {
    try {
        const { nome, cnpj, email, telefone, percentual_comissao } = req.body;
        const result = await pool.query(
            'INSERT INTO clientes (nome, cnpj, email, telefone, percentual_comissao) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nome, cnpj, email, telefone, percentual_comissao || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

// CLIENTES FINAIS
app.get('/api/clientes_finais', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes_finais ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});


app.post('/api/clientes_finais', auth, async (req, res) => {
    try {
        const data = req.body;
        console.log('POST clientes_finais:', data);
        
        // Gerar código automático vinculado ao cliente primário
        const codigo = data.cliente_primario_id ? await gerarCodigoLead(data.cliente_primario_id) : null;
        
        const result = await pool.query(
            `INSERT INTO clientes_finais (codigo, nome, cpf_cnpj, email, telefone, whatsapp, endereco_rua, endereco_numero, 
             endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, 
             cliente_primario_id, observacoes, status_contato, observacoes_contato, data_primeiro_contato,
             prioridade, tags, status, ultima_interacao, vendedor_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21, $22) RETURNING *`,
            [codigo, data.nome, data.cpf_cnpj, data.email, data.telefone, data.whatsapp, data.endereco_rua,
             data.endereco_numero, data.endereco_complemento, data.endereco_bairro, data.endereco_cidade,
             data.endereco_estado, data.endereco_cep, data.cliente_primario_id, data.observacoes,
             data.status_contato || 'não_contatado', data.observacoes_contato,
             data.prioridade || 'medium', data.tags || '[]', data.status || 'novo', data.ultima_interacao, data.vendedor_id || null]
        );
        console.log('Lead criado:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar lead:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clientes_finais/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const dados = req.body;
        
        // Campos permitidos para atualização
        const camposPermitidos = [
            'nome', 'email', 'telefone', 'whatsapp', 'cpf_cnpj',
            'endereco_rua', 'endereco_numero', 'endereco_bairro', 'endereco_cidade', 'endereco_estado', 'endereco_cep',
            'status_contato', 'ultima_tentativa', 'etapa_funil', 'temperatura', 
            'valor_potencial', 'data_followup', 'ultima_interacao', 
            'observacoes_contato', 'motivo_perda', 'vendedor_id', 'origem'
        ];
        
        // Montar query dinâmica
        const campos = [];
        const valores = [];
        let idx = 1;
        
        for (const campo of camposPermitidos) {
            if (dados[campo] !== undefined) {
                campos.push(`${campo} = $${idx}`);
                valores.push(dados[campo]);
                idx++;
            }
        }
        
        if (campos.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        
        valores.push(id);
        const query = `UPDATE clientes_finais SET ${campos.join(', ')} WHERE id = $${idx}`;
        
        await pool.query(query, valores);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar cliente_final:', error);
        res.status(500).json({ error: 'Erro ao atualizar' });
    }
});

// VENDEDORES
app.get('/api/vendedores', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vendedores ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post('/api/vendedores', auth, async (req, res) => {
    try {
        const { nome, email, telefone, meta_mensal, equipe_id, usuario_id } = req.body;
        const result = await pool.query(
            'INSERT INTO vendedores (nome, email, telefone, meta_mensal, equipe_id, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, email, telefone, meta_mensal || 0, equipe_id, usuario_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.put("/api/vendedores/:id", auth, async (req, res) => { try { const { id } = req.params; const { nome, email, telefone, meta_mensal, equipe_id, usuario_id, ativo } = req.body; const campos = []; const valores = []; let idx = 1; if (nome !== undefined) { campos.push("nome = $" + idx); valores.push(nome); idx++; } if (email !== undefined) { campos.push("email = $" + idx); valores.push(email); idx++; } if (telefone !== undefined) { campos.push("telefone = $" + idx); valores.push(telefone); idx++; } if (meta_mensal !== undefined) { campos.push("meta_mensal = $" + idx); valores.push(meta_mensal); idx++; } if (equipe_id !== undefined) { campos.push("equipe_id = $" + idx); valores.push(equipe_id); idx++; } if (usuario_id !== undefined) { campos.push("usuario_id = $" + idx); valores.push(usuario_id); idx++; } if (ativo !== undefined) { campos.push("ativo = $" + idx); valores.push(ativo); idx++; } if (campos.length === 0) return res.status(400).json({ error: "Nada para atualizar" }); valores.push(id); await pool.query("UPDATE vendedores SET " + campos.join(", ") + " WHERE id = $" + idx, valores); res.json({ success: true }); } catch (error) { console.error(error); res.status(500).json({ error: "Erro" }); } });

// VENDAS
app.get('/api/vendas', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vendas ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post("/api/vendas", auth, async (req, res) => {
    try {
        const d = req.body;
        const result = await pool.query(
            `INSERT INTO vendas (cliente_id, vendedor_id, cliente_final_id, valor_bruto, valor_comissao,
             valor_liquido, faturada, data, cliente_nome, vendedor_nome, tipo, forma_pagamento, parcelas,
             valor_parcela, juros_tipo, juros_percentual, recorrente, dia_cobranca, duracao_meses,
             produto, status_pagamento, data_vencimento, observacoes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
            [d.cliente_id, d.vendedor_id, d.cliente_final_id, d.valor_bruto, d.valor_comissao,
             d.valor_liquido, d.faturada || false, d.data || new Date().toISOString(), d.cliente_nome, d.vendedor_nome,
             d.tipo || "venda", d.forma_pagamento, d.parcelas || 1, d.valor_parcela, d.juros_tipo, d.juros_percentual,
             d.recorrente || false, d.dia_cobranca, d.duracao_meses, d.produto, d.status_pagamento || "pendente",
             d.data_vencimento, d.observacoes]
        );
        console.log("💰 Nova venda registrada:", result.rows[0].id);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao salvar venda:", error);
        res.status(500).json({ error: error.message });
    }
});
// LIGACOES
app.get('/api/ligacoes', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ligacoes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post('/api/ligacoes', auth, async (req, res) => {
    try {
        const data = req.body;
        console.log('📞 Nova ligação recebida:', JSON.stringify(data));
        
        const result = await pool.query(
            `INSERT INTO ligacoes (cliente_id, vendedor_id, cliente_final_id, status, duracao, data, 
             cliente_nome, vendedor_nome, observacoes) 
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8) RETURNING *`,
            [data.cliente_id || null, data.vendedor_id || 1, data.cliente_final_id || null, 
             data.status || 'tentada', data.duracao || 0,
             data.cliente_nome || '', data.vendedor_nome || '', data.observacoes || '']
        );
        
        console.log('✅ Ligação salva:', result.rows[0].id);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Erro ao salvar ligação:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// EQUIPES
app.get('/api/equipes', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM equipes ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post('/api/equipes', auth, async (req, res) => {
    try {
        const { nome, gestor_id } = req.body;
        const result = await pool.query(
            'INSERT INTO equipes (nome, gestor_id) VALUES ($1, $2) RETURNING *',
            [nome, gestor_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

// METAS
app.get('/api/metas', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM metas ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});


// PROPOSTAS
app.get('/api/propostas', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM propostas ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.post('/api/propostas', auth, async (req, res) => {
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO propostas (titulo, cliente_id, vendedor_id, valor_total, status, data_criacao, observacoes) 
             VALUES ($1, $2, $3, $4, $5, NOW(), $6) RETURNING *`,
            [data.titulo, data.cliente_id, data.vendedor_id, data.valor_total, data.status || 'rascunho', data.observacoes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.put('/api/propostas/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const fields = Object.keys(updates).map((key, i) => `${key} = $${i + 2}`).join(', ');
        const values = Object.values(updates);
        await pool.query(`UPDATE propostas SET ${fields} WHERE id = $1`, [id, ...values]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

app.delete('/api/propostas/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM propostas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
    try {
        const data = req.body;
        const result = await pool.query(
            `INSERT INTO metas (vendedor_id, tipo, periodo, valor_meta, mes, ano, vendedor_nome) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [data.vendedor_id, data.tipo, data.periodo, data.valor_meta, data.mes, data.ano, data.vendedor_nome]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro' });
    }
});

pool.connect((err) => {
    if (err) console.error('❌ Erro PostgreSQL:', err);
    else console.log('✅ Conectado ao PostgreSQL');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// ==================== TAREFAS ====================

// GET - Listar tarefas do usuário
app.get('/api/tarefas', auth, async (req, res) => {
    try {
        const { usuario_id, status } = req.query;
        let query = `
            SELECT t.*, cf.nome as lead_nome, cf.telefone as lead_telefone
            FROM tarefas t
            LEFT JOIN clientes_finais cf ON t.lead_id = cf.id
            WHERE 1=1
        `;
        const params = [];
        
        if (usuario_id) {
            params.push(usuario_id);
            query += ` AND t.usuario_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND t.status = $${params.length}`;
        }
        
        query += ' ORDER BY t.prioridade DESC, t.data_vencimento ASC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar tarefas:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST - Criar nova tarefa
app.post('/api/tarefas', auth, async (req, res) => {
    try {
        const { lead_id, usuario_id, tipo, descricao, data_vencimento, prioridade, automatica } = req.body;
        console.log('📋 Nova tarefa:', descricao);
        
        const result = await pool.query(
            `INSERT INTO tarefas (lead_id, usuario_id, tipo, descricao, data_vencimento, prioridade, automatica)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [lead_id || null, usuario_id, tipo || 'outro', descricao, data_vencimento || null, prioridade || 'normal', automatica || false]
        );
        
        console.log('✅ Tarefa criada:', result.rows[0].id);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Erro ao criar tarefa:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT - Atualizar tarefa (marcar concluída, etc)
app.put('/api/tarefas/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, descricao, data_vencimento, prioridade } = req.body;
        
        let query = 'UPDATE tarefas SET ';
        const updates = [];
        const params = [];
        
        if (status) {
            params.push(status);
            updates.push(`status = $${params.length}`);
            if (status === 'concluida') {
                updates.push(`concluida_at = NOW()`);
            }
        }
        if (descricao) {
            params.push(descricao);
            updates.push(`descricao = $${params.length}`);
        }
        if (data_vencimento) {
            params.push(data_vencimento);
            updates.push(`data_vencimento = $${params.length}`);
        }
        if (prioridade) {
            params.push(prioridade);
            updates.push(`prioridade = $${params.length}`);
        }
        
        params.push(id);
        query += updates.join(', ') + ` WHERE id = $${params.length} RETURNING *`;
        
        const result = await pool.query(query, params);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE - Excluir tarefa
app.delete('/api/tarefas/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tarefas WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir tarefa:', error);
        res.status(500).json({ error: error.message });
    }
});

// Servir arquivos estáticos
const pathModule = require('path');
app.use(express.static(pathModule.join(__dirname, '..')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(pathModule.join(__dirname, '..', 'index.html'));
});

// ==================== ROTAS DE EXCLUSÃO DE LEADS ====================

// Excluir lead individual
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM clientes_finais WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    res.json({ success: true, message: 'Lead excluído com sucesso', lead: result.rows[0] });
  } catch (error) {
    console.error('Erro ao excluir lead:', error);
    res.status(500).json({ error: 'Erro ao excluir lead' });
  }
});

// Excluir leads selecionados em massa
app.post("/api/leads/excluir-selecionados", auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum lead selecionado" });
    }
    
    // Limpar dependências primeiro
    await pool.query("DELETE FROM whatsapp_mensagens WHERE lead_id = ANY($1)", [ids]);
    await pool.query("DELETE FROM ligacoes WHERE cliente_final_id = ANY($1)", [ids]);
    await pool.query("DELETE FROM tarefas WHERE lead_id = ANY($1)", [ids]);
    await pool.query("DELETE FROM vendas WHERE cliente_final_id = ANY($1)", [ids]);
    await pool.query("UPDATE historico_ligacoes SET lead_id = NULL WHERE lead_id = ANY($1)", [ids]);
    
    // Agora excluir os leads
    const result = await pool.query("DELETE FROM clientes_finais WHERE id = ANY($1) RETURNING id", [ids]);
    
    res.json({ success: true, message: result.rowCount + " lead(s) excluído(s) com sucesso", count: result.rowCount });
  } catch (error) {
    console.error("Erro ao excluir leads:", error);
    res.status(500).json({ error: "Erro ao excluir leads: " + error.message });
  }
});

// Excluir todos leads de um cliente primário
app.delete('/api/leads/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const result = await pool.query(
      'DELETE FROM clientes_finais WHERE cliente_id = $1 RETURNING id',
      [clienteId]
    );
    res.json({ 
      success: true, 
      message: result.rowCount + ' lead(s) excluído(s) com sucesso',
      count: result.rowCount 
    });
  } catch (error) {
    console.error('Erro ao excluir leads do cliente:', error);
    res.status(500).json({ error: 'Erro ao excluir leads do cliente' });
  }
});


// ==================== IMPORTAÇÃO DE LEADS COM VALIDAÇÃO ====================

// Função para gerar código único
const gerarCodigoLead = async (cliente_primario_id) => {
  // Buscar nome do cliente primário
  const clienteResult = await pool.query(
    "SELECT nome FROM clientes WHERE id = $1",
    [cliente_primario_id]
  );
  
  let prefixo = 'LEAD';
  if (clienteResult.rows.length > 0) {
    // Pegar primeira palavra do nome e limitar a 10 caracteres
    const nomeCliente = clienteResult.rows[0].nome;
    prefixo = nomeCliente.split(' ')[0].toUpperCase().substring(0, 10);
  }
  
  // Buscar último código deste cliente
  const result = await pool.query(
    "SELECT codigo FROM clientes_finais WHERE cliente_primario_id = $1 AND codigo LIKE $2 ORDER BY codigo DESC LIMIT 1",
    [cliente_primario_id, prefixo + '-%']
  );
  
  let sequencial = 1;
  if (result.rows.length > 0) {
    const ultimoCodigo = result.rows[0].codigo;
    const partes = ultimoCodigo.split('-');
    const ultimoNum = parseInt(partes[partes.length - 1]) || 0;
    sequencial = ultimoNum + 1;
  }
  
  return prefixo + '-' + String(sequencial).padStart(4, '0');
};

// Validar planilha antes de importar (verifica duplicados)
app.post('/api/leads/validar-planilha', async (req, res) => {
  try {
    const { leads, cliente_primario_id } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Nenhum lead para validar' });
    }
    
    if (!cliente_primario_id) {
      return res.status(400).json({ error: 'Cliente primário não selecionado' });
    }
    
    const resultados = [];
    const telefonesPlanilha = new Set();
    const emailsPlanilha = new Set();
    
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const erros = [];
      const avisos = [];
      let status = 'ok'; // ok, aviso, erro
      
      // Validar nome obrigatório
      if (!lead.nome || lead.nome.trim() === '') {
        erros.push('Nome é obrigatório');
        status = 'erro';
      }
      
      const telefone = String(lead.telefone || '').trim();
      const email = String(lead.email || '').trim().toLowerCase();
      
      // Verificar duplicidade na própria planilha
      if (telefone && telefone.length >= 8) {
        if (telefonesPlanilha.has(telefone)) {
          avisos.push('Telefone duplicado na planilha');
          if (status !== 'erro') status = 'aviso';
        } else {
          telefonesPlanilha.add(telefone);
        }
      }
      
      if (email && email.includes('@')) {
        if (emailsPlanilha.has(email)) {
          avisos.push('Email duplicado na planilha');
          if (status !== 'erro') status = 'aviso';
        } else {
          emailsPlanilha.add(email);
        }
      }
      
      // Verificar duplicidade no banco
      if (telefone && telefone.length >= 8) {
        const dupTel = await pool.query(
          'SELECT id, nome, codigo FROM clientes_finais WHERE telefone = $1 AND cliente_primario_id = $2 LIMIT 1',
          [telefone, cliente_primario_id]
        );
        if (dupTel.rows.length > 0) {
          avisos.push('Telefone já existe: ' + dupTel.rows[0].nome + (dupTel.rows[0].codigo ? ' (' + dupTel.rows[0].codigo + ')' : ''));
          if (status !== 'erro') status = 'aviso';
        }
      }
      
      if (email && email.includes('@')) {
        const dupEmail = await pool.query(
          'SELECT id, nome, codigo FROM clientes_finais WHERE LOWER(email) = $1 AND cliente_primario_id = $2 LIMIT 1',
          [email, cliente_primario_id]
        );
        if (dupEmail.rows.length > 0) {
          avisos.push('Email já existe: ' + dupEmail.rows[0].nome + (dupEmail.rows[0].codigo ? ' (' + dupEmail.rows[0].codigo + ')' : ''));
          if (status !== 'erro') status = 'aviso';
        }
      }
      
      resultados.push({
        linha: i + 1,
        nome: lead.nome || '',
        telefone: telefone,
        email: email,
        valor: lead.valor_potencial || 0,
        status: status,
        erros: erros,
        avisos: avisos
      });
    }
    
    const resumo = {
      total: resultados.length,
      novos: resultados.filter(r => r.status === 'ok').length,
      avisos: resultados.filter(r => r.status === 'aviso').length,
      erros: resultados.filter(r => r.status === 'erro').length
    };
    
    res.json({ resultados, resumo });
  } catch (error) {
    console.error('Erro ao validar planilha:', error);
    res.status(500).json({ error: 'Erro ao validar planilha' });
  }
});

// Importar leads com código automático (versão melhorada)
app.post('/api/leads/importar-validado', async (req, res) => {
  try {
    const { leads, cliente_primario_id, origem, ignorar_duplicados } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Nenhum lead para importar' });
    }
    
    if (!cliente_primario_id) {
      return res.status(400).json({ error: 'Cliente primário não selecionado' });
    }
    
    let inseridos = 0;
    let ignorados = 0;
    const codigosGerados = [];
    
    for (const lead of leads) {
      // Pular leads sem nome
      if (!lead.nome || lead.nome.trim() === '') {
        ignorados++;
        continue;
      }
      
      const telefone = String(lead.telefone || '').trim();
      const email = String(lead.email || '').trim().toLowerCase();
      
      // Se não ignorar duplicados, verificar
      if (true) { // SEMPRE verifica duplicado por telefone
        let isDuplicado = false;
        
        if (telefone && telefone.length >= 8) {
          const dupTel = await pool.query(
            'SELECT id FROM clientes_finais WHERE telefone = $1 AND cliente_primario_id = $2 LIMIT 1',
            [telefone, cliente_primario_id]
          );
          if (dupTel.rows.length > 0) isDuplicado = true;
        }
        
        if (!isDuplicado && email && email.includes('@')) {
          const dupEmail = await pool.query(
            'SELECT id FROM clientes_finais WHERE LOWER(email) = $1 AND cliente_primario_id = $2 LIMIT 1',
            [email, cliente_primario_id]
          );
          if (dupEmail.rows.length > 0) isDuplicado = true;
        }
        
        if (isDuplicado) {
          ignorados++;
          continue;
        }
      }
      
      // Gerar código único
      const codigo = await gerarCodigoLead(cliente_primario_id);
      
      // Inserir lead
      await pool.query(
        `INSERT INTO clientes_finais (codigo, nome, telefone, email, valor_potencial, observacoes, cliente_primario_id, status_contato, etapa_funil, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'não_contatado', 'novo', NOW())`,
        [codigo, lead.nome.trim(), telefone || null, email || null, parseFloat(lead.valor_potencial) || 0, lead.observacoes || origem || 'Importação', cliente_primario_id]
      );
      
      inseridos++;
      codigosGerados.push(codigo);
    }
    
    res.json({ 
      success: true, 
      inseridos, 
      ignorados,
      total: leads.length,
      primeiro_codigo: codigosGerados[0] || null,
      ultimo_codigo: codigosGerados[codigosGerados.length - 1] || null
    });
  } catch (error) {
    console.error('Erro ao importar leads:', error);
    res.status(500).json({ error: 'Erro ao importar leads: ' + error.message });
  }
});


// Rota para download do modelo de importação
app.get('/api/leads/modelo-excel', (req, res) => {
  const pathModule = require('path');
  const filePath = pathModule.join(__dirname, '..', 'modelo_importacao_leads.xlsx');
  res.download(filePath, 'modelo_importacao_leads.xlsx');
});


// ==================== INTEGRACAO WHATSAPP Z-API ====================

let ZAPI_INSTANCE_ID = '';
let ZAPI_TOKEN = '';
let ZAPI_CLIENT_TOKEN = '';

const carregarConfigWhatsApp = async () => {
  try {
    const result = await pool.query('SELECT * FROM whatsapp_config ORDER BY id DESC LIMIT 1');
    if (result.rows.length > 0) {
      ZAPI_INSTANCE_ID = result.rows[0].instance_id || '';
      ZAPI_TOKEN = result.rows[0].token || '';
      ZAPI_CLIENT_TOKEN = result.rows[0].client_token || '';
    }
  } catch (e) { console.error('Erro config WhatsApp:', e); }
};
carregarConfigWhatsApp();

app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const data = req.body;
    console.log('Webhook WhatsApp:', JSON.stringify(data).substring(0, 500));
    
    // Tratar webhooks de status (entregue/lido)
    if (data.type === "MessageStatusCallback" && data.ids && data.ids.length > 0) {
      const status = data.status; // DELIVERED ou READ
      for (const msgId of data.ids) {
        await pool.query("UPDATE whatsapp_mensagens SET status = $1 WHERE message_id = $2", [status, msgId]);
      }
      return res.status(200).json({ success: true });
    }
    
    if (!data.phone) return res.status(200).json({ success: true });
    
    // Manter telefone original se for LID
    let telefone = data.phone;
    const isLid = telefone.includes("@lid");
    if (!isLid) {
        telefone = telefone.replace(/\D/g, "");
        if (telefone.length > 15 && !telefone.startsWith("55") && !data.isGroup) {
            return res.status(200).json({ success: true });
        }
    }
    const messageId = data.messageId || Date.now().toString();
    const isGrupo = data.isGroup || false;
    const nomeGrupo = isGrupo ? (data.chatName || 'Grupo') : null;
    const fromMe = data.fromMe || false;
    
    // Determinar tipo e conteúdo da mensagem
    let tipo = 'text';
    let mensagem = '';
    let arquivoUrl = null;
    
    if (data.text) {
      tipo = 'text';
      mensagem = data.text.message || data.text;
    } else if (data.image) {
      tipo = 'image';
      mensagem = data.image.caption || '[Imagem]';
      arquivoUrl = data.image.imageUrl;
    } else if (data.audio) {
      tipo = 'audio';
      mensagem = '[Áudio]';
      arquivoUrl = data.audio.audioUrl;
    } else if (data.document) {
      tipo = 'document';
      mensagem = '[Documento] ' + (data.document.fileName || '');
      arquivoUrl = data.document.documentUrl;
    } else if (data.video) {
      tipo = 'video';
      mensagem = data.video.caption || '[Vídeo]';
      arquivoUrl = data.video.videoUrl;
    } else if (data.sticker) {
      tipo = 'sticker';
      mensagem = '[Figurinha]';
      arquivoUrl = data.sticker.stickerUrl;
    } else {
      return res.status(200).json({ success: true });
    }
    
    // Buscar nome existente para mensagens enviadas
    let nomeExistente = null;
    if (!isGrupo) {
      const nomeResult = await pool.query("SELECT nome_contato FROM whatsapp_mensagens WHERE telefone = $1 AND nome_contato != $1 AND nome_contato IS NOT NULL AND nome_contato != '' LIMIT 1", [telefone]);
      if (nomeResult.rows.length > 0) nomeExistente = nomeResult.rows[0].nome_contato;
    }
    const nomeContato = isGrupo ? (data.senderName || 'Participante') : (nomeExistente || (fromMe ? data.chatName : data.senderName) || data.chatName || '');
    
    let leadId = null;
    let vendedorId = null;
    if (!isGrupo) {
      // Primeiro buscar vendedor da conversa existente
      const conversaExistente = await pool.query(
        "SELECT vendedor_id FROM whatsapp_mensagens WHERE telefone = $1 AND vendedor_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
        [telefone]
      );
      if (conversaExistente.rows.length > 0) {
        vendedorId = conversaExistente.rows[0].vendedor_id;
      }
      // Se nao encontrou, buscar pelo lead
      if (!vendedorId) {
        const leadResult = await pool.query(
          "SELECT id, vendedor_id FROM clientes_finais WHERE telefone LIKE $1 OR whatsapp LIKE $1 LIMIT 1",
          ["%" + telefone.slice(-8) + "%"]
        );
        if (leadResult.rows.length > 0) {
          leadId = leadResult.rows[0].id;
          vendedorId = leadResult.rows[0].vendedor_id;
        }
      }
    }
    
    const nomeRemetente = fromMe ? (data.senderName || 'Você') : (data.senderName || '');
    await pool.query(
      "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, is_grupo, nome_grupo, arquivo_url, status, nome_remetente) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (message_id) DO UPDATE SET status = EXCLUDED.status WHERE EXCLUDED.status IN ('DELIVERED', 'READ') OR (whatsapp_mensagens.status = 'SENT' AND EXCLUDED.status = 'RECEIVED')",
      [messageId, telefone, nomeContato, mensagem, tipo, fromMe ? 'enviada' : 'recebida', leadId, vendedorId, isGrupo, nomeGrupo, arquivoUrl, data.status || 'SENT', nomeRemetente]
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro webhook:', error);
    res.status(200).json({ success: true });
  }
});


app.get('/api/whatsapp/conversas', auth, async (req, res) => {
  try {
    const { vendedor_id, mes, ano } = req.query;
    console.log("[Conversas] vendedor_id recebido:", vendedor_id);
    let query = "SELECT * FROM (SELECT DISTINCT ON (telefone) telefone, COALESCE((SELECT m3.nome_contato FROM whatsapp_mensagens m3 WHERE m3.telefone = m.telefone AND m3.nome_contato IS NOT NULL AND m3.nome_contato != '' ORDER BY m3.id DESC LIMIT 1), m.nome_contato) as nome_contato, mensagem, created_at, lead_id, vendedor_id, direcao, is_grupo, nome_grupo, (SELECT COUNT(*) FROM whatsapp_mensagens m2 WHERE m2.telefone = m.telefone AND m2.lida = false AND m2.direcao = 'recebida') as nao_lidas FROM whatsapp_mensagens m";
    const params = [];
    
    if (vendedor_id) {
      query += " WHERE (vendedor_id = $1 OR telefone IN (SELECT DISTINCT telefone FROM whatsapp_mensagens WHERE vendedor_id = $1))";
      params.push(vendedor_id);
    }
    query += ' ORDER BY telefone, created_at DESC) sub ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
});

app.get('/api/whatsapp/mensagens/:telefone', auth, async (req, res) => {
  try {
    const { telefone } = req.params;
    const result = await pool.query('SELECT * FROM whatsapp_mensagens WHERE telefone = $1 ORDER BY created_at ASC', [telefone]);
    await pool.query("UPDATE whatsapp_mensagens SET lida = true WHERE telefone = $1 AND direcao = 'recebida'", [telefone]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

app.post('/api/whatsapp/enviar', auth, async (req, res) => {
  console.log('Enviando WhatsApp - Instance:', ZAPI_INSTANCE_ID, 'Token:', ZAPI_TOKEN ? 'OK' : 'VAZIO');
  try {
    const { telefone, mensagem, lead_id, vendedor_id, nome_contato } = req.body;
    if (!telefone || !mensagem) return res.status(400).json({ error: 'Telefone e mensagem obrigatorios' });
    
    let tel = telefone;
    // Se for grupo ou LID, manter original. Se for telefone normal, formatar
    if (tel.includes("@") || tel.includes("-group") || tel.length > 15) {
        // Grupo ou LID - manter original
    } else {
        tel = tel.replace(/\D/g, "");
        if (tel.length > 0 && tel.substring(0,2) !== "55") tel = "55" + tel;
    }
    
    const fetch = require('node-fetch');
    const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/send-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
      body: JSON.stringify({ phone: tel, message: mensagem })
    });
    
    const result = await response.json();
    console.log('Resposta Z-API:', JSON.stringify(result));
    console.log('Telefone enviado:', tel);
    
    if (result.zapiId || result.messageId) {
      await pool.query(
        "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status) VALUES ($1, $2, $3, $4, 'text', 'enviada', $5, $6, 'enviada')",
        [result.zapiId || result.messageId, tel, nome_contato || "", mensagem, lead_id, vendedor_id]
      );
      if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
      res.json({ success: true, messageId: result.zapiId || result.messageId });
    } else {
      res.status(400).json({ error: 'Erro ao enviar', details: result });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

app.post('/api/whatsapp/config', auth, async (req, res) => {
  try {
    const { instance_id, token, client_token } = req.body;
    await pool.query('DELETE FROM whatsapp_config');
    await pool.query(
      'INSERT INTO whatsapp_config (instance_id, token, client_token, status) VALUES ($1, $2, $3, $4)',
      [instance_id, token, client_token || '', 'conectado']
    );
    ZAPI_INSTANCE_ID = instance_id;
    ZAPI_TOKEN = token;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar config' });
  }
});

app.get('/api/whatsapp/config', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM whatsapp_config ORDER BY id DESC LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar config' });
  }
});


// Buscar contatos do WhatsApp via Z-API
app.get('/api/whatsapp/contatos', auth, async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/contacts', {
      method: 'GET',
      headers: { 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' }
    });
    const contatos = await response.json();
    res.json(contatos);
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({ error: 'Erro ao buscar contatos' });
  }
});

// Enviar imagem via WhatsApp
app.post('/api/whatsapp/enviar-imagem', auth, async (req, res) => {
  try {
    const { telefone, imageUrl, caption, lead_id, vendedor_id, nome_contato } = req.body;
    if (!telefone || !imageUrl) return res.status(400).json({ error: 'Telefone e imagem obrigatórios' });
    
    let tel = telefone;
    if (!tel.startsWith('55') && tel.length <= 11) tel = '55' + tel;
    
    const fetch = require('node-fetch');
    const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/send-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
      body: JSON.stringify({ phone: tel, image: imageUrl, caption: caption || '' })
    });
    
    const result = await response.json();
    console.log('Envio imagem:', result);
    
    if (result.zapiId || result.messageId) {
      await pool.query(
        "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status, arquivo_url) VALUES ($1, $2, $3, $4, 'image', 'enviada', $5, $6, 'enviada', $7)",
        [result.zapiId || result.messageId, tel, nome_contato || "", caption || "[Imagem]", lead_id || null, vendedor_id || null, imageUrl]
      );
      if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
      res.json({ success: true, messageId: result.zapiId || result.messageId });
    } else {
      res.status(400).json({ error: 'Erro ao enviar imagem', details: result });
    }
  } catch (error) {
    console.error('Erro enviar imagem:', error);
    res.status(500).json({ error: 'Erro ao enviar imagem' });
  }
});

// Enviar documento via WhatsApp
app.post('/api/whatsapp/enviar-documento', auth, async (req, res) => {
  try {
    const { telefone, documentUrl, documentName, lead_id, vendedor_id, caption, nome_contato } = req.body;
    if (!telefone || !documentUrl) return res.status(400).json({ error: 'Telefone e documento obrigatórios' });
    
    let tel = telefone;
    if (!tel.startsWith('55') && tel.length <= 11) tel = '55' + tel;
    
    // Detectar extensão do arquivo
    const ext = (documentName || 'documento.pdf').split('.').pop().toLowerCase();
    const validExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'ppt', 'pptx'];
    const endpoint = validExts.includes(ext) ? '/send-document/' + ext : '/send-document/pdf';
    
    const fetch = require('node-fetch');
    const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
      body: JSON.stringify({ phone: tel, document: documentUrl, fileName: documentName || 'documento.pdf', caption: caption || '' })
    });
    
    const result = await response.json();
    console.log('Envio documento:', result);
    
    if (result.zapiId || result.messageId) {
      await pool.query(
        "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status, arquivo_url, arquivo_nome) VALUES ($1, $2, $3, $4, 'document', 'enviada', $5, $6, 'enviada', $7, $8)",
        [result.zapiId || result.messageId, tel, nome_contato || "", caption ? caption + " [Documento] " + (documentName || "documento.pdf") : "[Documento] " + (documentName || "documento.pdf"), lead_id || null, vendedor_id || null, documentUrl, documentName]
      );
      if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
      res.json({ success: true, messageId: result.zapiId || result.messageId });
    } else {
      res.status(400).json({ error: 'Erro ao enviar documento', details: result });
    }
  } catch (error) {
    console.error('Erro enviar documento:', error);
    res.status(500).json({ error: 'Erro ao enviar documento' });
  }
});

// Enviar áudio via WhatsApp
app.post('/api/whatsapp/enviar-audio', auth, async (req, res) => {
  try {
    const { telefone, audioUrl, lead_id, vendedor_id, nome_contato } = req.body;
    if (!telefone || !audioUrl) return res.status(400).json({ error: 'Telefone e áudio obrigatórios' });
    
    let tel = telefone;
    if (!tel.startsWith('55') && tel.length <= 11) tel = '55' + tel;
    
    const fetch = require('node-fetch');
    const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/send-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
      body: JSON.stringify({ phone: tel, audio: audioUrl })
    });
    
    const result = await response.json();
    console.log('Envio audio:', result);
    
    if (result.zapiId || result.messageId) {
      await pool.query(
        "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status, arquivo_url) VALUES ($1, $2, $3, $4, 'audio', 'enviada', $5, $6, 'enviada', $7)",
        [result.zapiId || result.messageId, tel, nome_contato || "", "[Áudio]", lead_id || null, vendedor_id || null, audioUrl]
      );
      if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
      res.json({ success: true, messageId: result.zapiId || result.messageId });
    } else {
      res.status(400).json({ error: 'Erro ao enviar áudio', details: result });
    }
  } catch (error) {
    console.error('Erro enviar audio:', error);
    res.status(500).json({ error: 'Erro ao enviar áudio' });
  }
});

// Upload de arquivo para envio
const multer = require('multer');
const uploadDir = pathModule.join(__dirname, '..', 'uploads');
if (!require('fs').existsSync(uploadDir)) require('fs').mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 16 * 1024 * 1024 } });

app.post('/api/whatsapp/upload', auth, upload.single('arquivo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    const fileUrl = 'https://gsdcomercial.com.br/uploads/' + req.file.filename;
    res.json({ success: true, url: fileUrl, filename: req.file.originalname, type: req.file.mimetype });
  } catch (error) {
    console.error('Erro upload:', error);
    res.status(500).json({ error: 'Erro no upload' });
  }
});

// Webhook Net2Phone - Histórico de Ligações com Download de Gravações
const fs = require('fs');
const https = require('https');
const http = require('http');

const downloadGravacao = async (url, leadId, ligacaoId) => {
    const path = require('path');
    if (!url) return null;
    
    // Organizar por lead/ano/mês
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    
    const pastaLead = leadId ? `lead_${leadId}` : 'sem_lead';
    const pasta = path.join(__dirname, '..', 'gravacoes', pastaLead, String(ano), mes);
    if (!fs.existsSync(pasta)) {
        fs.mkdirSync(pasta, { recursive: true });
    }
    
    const nomeArquivo = `ligacao_${ligacaoId}_${Date.now()}.mp3`;
    const caminhoLocal = path.join(pasta, nomeArquivo);
    const caminhoRelativo = `/gravacoes/${pastaLead}/${ano}/${mes}/${nomeArquivo}`;
    
    return new Promise((resolve) => {
        const protocolo = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(caminhoLocal);
        
        protocolo.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('Gravação baixada:', caminhoRelativo);
                resolve(caminhoRelativo);
            });
        }).on('error', (err) => {
            fs.unlink(caminhoLocal, () => {});
            console.error('Erro ao baixar gravação:', err.message);
            resolve(null);
        });
    });
};

app.post('/api/webhook/net2phone', async (req, res) => {
    try {
        console.log('Webhook Net2Phone recebido:', JSON.stringify(req.body));
        
        const data = req.body;
        const telefone = data.phone || data.caller_id || data.destination || data.from || data.to || '';
        const tipo = (data.direction === 'inbound' || data.type === 'inbound') ? 'entrada' : 'saida';
        const duracao = parseInt(data.duration || data.talk_time || data.billsec || 0);
        const status = data.status || data.disposition || data.call_status || 'desconhecido';
        const gravacao_url = data.recording_url || data.recording || data.recordingUrl || null;
        const data_raw = data.start_time || data.created_at || data.timestamp || new Date().toISOString(); const data_ligacao = new Date(new Date(data_raw).getTime() - (3 * 60 * 60 * 1000)).toISOString();
        
        // Buscar lead pelo telefone (últimos 11 dígitos)
        const telefoneNormalizado = telefone.replace(/\D/g, '').slice(-11);
        
        let lead_id = null;
        if (telefoneNormalizado.length >= 8) {
            const leadResult = await pool.query(
                `SELECT id FROM clientes_finais WHERE 
                 REPLACE(REPLACE(REPLACE(REPLACE(telefone, '-', ''), ' ', ''), '(', ''), ')', '') LIKE $1 OR 
                 REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, '-', ''), ' ', ''), '(', ''), ')', '') LIKE $1 
                 LIMIT 1`,
                ['%' + telefoneNormalizado]
            );
            lead_id = leadResult.rows.length > 0 ? leadResult.rows[0].id : null;
        }
        
        // Inserir no histórico
        const insertResult = await pool.query(
            `INSERT INTO historico_ligacoes (lead_id, telefone, tipo, duracao, status, gravacao_url, data_ligacao) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [lead_id, telefone, tipo, duracao, status, gravacao_url, data_ligacao]
        );
        
        const ligacaoId = insertResult.rows[0].id;
        console.log('Ligação registrada ID:', ligacaoId, 'Lead:', lead_id);
        
        // Baixar gravação automaticamente se tiver URL
        if (gravacao_url) {
            const gravacao_local = await downloadGravacao(gravacao_url, lead_id, ligacaoId);
            if (gravacao_local) {
                await pool.query(
                    'UPDATE historico_ligacoes SET gravacao_local = $1 WHERE id = $2',
                    [gravacao_local, ligacaoId]
                );
                console.log('Gravação salva localmente:', gravacao_local);
            }
        }
        
        res.json({ success: true, ligacao_id: ligacaoId });
    } catch (error) {
        console.error('Erro webhook Net2Phone:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar histórico de ligações de um lead
app.get('/api/ligacoes/:leadId', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM historico_ligacoes WHERE lead_id = $1 ORDER BY data_ligacao DESC',
            [req.params.leadId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Buscar histórico de ligações de um lead
app.get('/api/historico-ligacoes/:leadId', auth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM historico_ligacoes WHERE lead_id = $1 ORDER BY data_ligacao DESC',
            [req.params.leadId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== KPIs DE LIGAÇÕES NET2PHONE ==========
app.get('/api/kpis-net2phone', auth, async (req, res) => {
    try {
        const hoje = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        // KPIs de HOJE
        const kpisHoje = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('answered', 'completed')) as atendidas,
                COUNT(*) FILTER (WHERE status IN ('no-answer', 'busy', 'failed', 'missed')) as nao_atendidas,
                COUNT(*) FILTER (WHERE status = 'voicemail') as caixa_postal,
                COUNT(*) FILTER (WHERE tipo = 'entrada') as entrada,
                COUNT(*) FILTER (WHERE tipo = 'saida') as saida,
                COALESCE(SUM(duracao), 0) as duracao_total,
                COALESCE(AVG(duracao) FILTER (WHERE duracao > 0), 0) as duracao_media
            FROM historico_ligacoes 
            WHERE DATE(data_ligacao) = $1
        `, [hoje]);
        
        // KPIs do MÊS
        const kpisMes = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('answered', 'completed')) as atendidas,
                COUNT(*) FILTER (WHERE status IN ('no-answer', 'busy', 'failed', 'missed')) as nao_atendidas,
                COUNT(*) FILTER (WHERE status = 'voicemail') as caixa_postal,
                COALESCE(SUM(duracao), 0) as duracao_total,
                COALESCE(AVG(duracao) FILTER (WHERE duracao > 0), 0) as duracao_media
            FROM historico_ligacoes 
            WHERE DATE(data_ligacao) >= $1
        `, [inicioMes]);
        
        // Top leads por ligações
        const topLeads = await pool.query(`
            SELECT 
                hl.lead_id,
                cf.nome as lead_nome,
                COUNT(*) as total_ligacoes,
                COUNT(*) FILTER (WHERE hl.status IN ('answered', 'completed')) as atendidas,
                SUM(hl.duracao) as duracao_total
            FROM historico_ligacoes hl
            LEFT JOIN clientes_finais cf ON cf.id = hl.lead_id
            WHERE DATE(hl.data_ligacao) >= $1 AND hl.lead_id IS NOT NULL
            GROUP BY hl.lead_id, cf.nome
            ORDER BY total_ligacoes DESC
            LIMIT 5
        `, [inicioMes]);
        
        // Ligações por dia (últimos 7 dias)
        const porDia = await pool.query(`
            SELECT 
                DATE(data_ligacao) as dia,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status IN ('answered', 'completed')) as atendidas
            FROM historico_ligacoes 
            WHERE data_ligacao >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(data_ligacao)
            ORDER BY dia DESC
        `);
        
        res.json({
            hoje: {
                total: parseInt(kpisHoje.rows[0].total),
                atendidas: parseInt(kpisHoje.rows[0].atendidas),
                naoAtendidas: parseInt(kpisHoje.rows[0].nao_atendidas),
                caixaPostal: parseInt(kpisHoje.rows[0].caixa_postal),
                entrada: parseInt(kpisHoje.rows[0].entrada),
                saida: parseInt(kpisHoje.rows[0].saida),
                duracaoTotal: parseInt(kpisHoje.rows[0].duracao_total),
                duracaoMedia: Math.round(parseFloat(kpisHoje.rows[0].duracao_media)),
                taxaAtendimento: kpisHoje.rows[0].total > 0 
                    ? Math.round((kpisHoje.rows[0].atendidas / kpisHoje.rows[0].total) * 100) 
                    : 0
            },
            mes: {
                total: parseInt(kpisMes.rows[0].total),
                atendidas: parseInt(kpisMes.rows[0].atendidas),
                naoAtendidas: parseInt(kpisMes.rows[0].nao_atendidas),
                caixaPostal: parseInt(kpisMes.rows[0].caixa_postal),
                duracaoTotal: parseInt(kpisMes.rows[0].duracao_total),
                duracaoMedia: Math.round(parseFloat(kpisMes.rows[0].duracao_media)),
                taxaAtendimento: kpisMes.rows[0].total > 0 
                    ? Math.round((kpisMes.rows[0].atendidas / kpisMes.rows[0].total) * 100) 
                    : 0
            },
            topLeads: topLeads.rows,
            porDia: porDia.rows
        });
    } catch (error) {
        console.error('❌ Erro KPIs Net2Phone:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== HISTÓRICO COMPLETO DE LIGAÇÕES ==========
app.get('/api/historico-ligacoes-todas', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT hl.*, cf.nome as lead_nome, cf.telefone as lead_telefone
            FROM historico_ligacoes hl
            LEFT JOIN clientes_finais cf ON cf.id = hl.lead_id
            ORDER BY hl.data_ligacao DESC
            LIMIT 500
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// POLLING NET2PHONE - Busca ligações a cada 5 min
// ============================================
async function buscarLigacoesNet2Phone() {
  try {
    console.log('[Net2Phone] Buscando ligacoes...');
    const fetch = (await import('node-fetch')).default;
    const fs = (await import('fs')).default;
    const pathModule = (await import('path')).default;
    
    const response = await fetch(`${NET2PHONE_API_URL}/call-detail-records:search`, {
      method: 'POST',
      headers: { 'X-API-Key': NET2PHONE_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 })
    });
    if (!response.ok) { console.error('[Net2Phone] Erro API:', response.status); return; }
    const data = await response.json();
    let novas = 0;
    
    for (const lig of (data.items || [])) {
      const existe = await pool.query('SELECT id FROM historico_ligacoes WHERE net2phone_id = $1', [lig.id]);
      if (existe.rows.length > 0) continue;
      
      const tipo = lig.direction === 'inbound' ? 'entrada' : 'saida';
      let status = lig.result === 'not_answered' ? 'no-answer' : lig.result === 'answered' ? 'answered' : 'completed';
      const telefone = tipo === 'saida' ? (lig.to_normalized?.id || lig.to || '') : (lig.from_normalized?.id || lig.from || '');
      const usuario = lig.caller?.user?.first_name ? (lig.caller.user.first_name + ' ' + (lig.caller.user.last_name || '')).trim() : null;
      const gravacaoId = lig.caller_call_recording?.id || lig.callee_call_recording?.id || null;
      
      // BUSCAR LEAD PELO TELEFONE
      let leadId = null;
      const telefoneNumeros = telefone.replace(/\D/g, '');
      if (telefoneNumeros.length >= 9) {
        const ultimos9 = telefoneNumeros.slice(-9);
        const leadResult = await pool.query(
          "SELECT id FROM clientes_finais WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') LIKE '%' || $1",
          [ultimos9]
        );
        if (leadResult.rows.length > 0) {
          leadId = leadResult.rows[0].id;
          console.log('[Net2Phone] Lead encontrado: ' + leadId + ' para telefone ' + telefone);
        }
      }
      
      // BAIXAR GRAVACAO SE EXISTIR E TIVER LEAD
      let gravacaoLocal = null;
      if (gravacaoId && leadId) {
        try {
          const recResp = await fetch(`${NET2PHONE_API_URL}/call-recordings/${gravacaoId}:generate-audio-download-link`, {
            headers: { 'X-API-Key': NET2PHONE_API_KEY, 'Accept': 'application/json' }
          });
          if (recResp.ok) {
            const recData = await recResp.json();
            if (recData.url) {
              const audioResp = await fetch(recData.url);
              if (audioResp.ok) {
                const agora = new Date();
                const ano = agora.getFullYear();
                const mes = String(agora.getMonth() + 1).padStart(2, '0');
                const timestamp = Date.now();
                const pastaLead = '/var/www/sistema-gestao/gravacoes/lead_' + leadId + '/' + ano + '/' + mes;
                fs.mkdirSync(pastaLead, { recursive: true });
                const nomeArquivo = 'ligacao_net2phone_' + gravacaoId + '_' + timestamp + '.mp3';
                const caminhoCompleto = pathModule.join(pastaLead, nomeArquivo);
                const buffer = await audioResp.buffer();
                fs.writeFileSync(caminhoCompleto, buffer);
                gravacaoLocal = '/gravacoes/lead_' + leadId + '/' + ano + '/' + mes + '/' + nomeArquivo;
                console.log('[Net2Phone] Gravacao salva: ' + gravacaoLocal);
              }
            }
          }
        } catch (e) { console.error('[Net2Phone] Erro baixar gravacao:', e.message); }
      }
      
      // INSERIR NO BANCO
      await pool.query(
        "INSERT INTO historico_ligacoes (lead_id, telefone, tipo, duracao, status, data_ligacao, notas, net2phone_id, gravacao_id, gravacao_local, usuario_net2phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [leadId, telefone, tipo, lig.duration_seconds || 0, status, lig.start_time, 'Via Net2Phone - ' + (usuario || 'Sistema'), lig.id, gravacaoId, gravacaoLocal, usuario]
      );
      novas++;
    }
    console.log('[Net2Phone] ' + novas + ' novas ligacoes salvas');
  } catch (error) { console.error('[Net2Phone] Erro:', error.message); }
}

setTimeout(() => buscarLigacoesNet2Phone(), 5000);
setInterval(() => buscarLigacoesNet2Phone(), 5 * 60 * 1000);
console.log('[Net2Phone] Polling iniciado - buscando a cada 5 minutos');


// ROTAS AUXILIARES DE LEADS

app.get('/api/leads/relatorio', auth, async (req, res) => {
    try {
        const { cliente_primario_id } = req.query;
        let query = `
            SELECT vendedor_id, COUNT(*) as total,
                   SUM(CASE WHEN etapa_funil = 'ganho' THEN 1 ELSE 0 END) as ganhos,
                   SUM(CASE WHEN etapa_funil = 'perdido' THEN 1 ELSE 0 END) as perdidos
            FROM clientes_finais
            WHERE vendedor_id IS NOT NULL
        `;
        const params = [];
        if (cliente_primario_id) {
            params.push(cliente_primario_id);
            query += ` AND cliente_primario_id = $${params.length}`;
        }
        query += ' GROUP BY vendedor_id';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/leads/sem-vendedor', auth, async (req, res) => {
    try {
        const { cliente_primario_id } = req.query;
        let query = 'SELECT * FROM clientes_finais WHERE vendedor_id IS NULL';
        const params = [];
        if (cliente_primario_id) {
            params.push(cliente_primario_id);
            query += ` AND cliente_primario_id = $${params.length}`;
        }
        query += ' ORDER BY id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== METAS POR VENDEDOR/CLIENTE ==========

// Listar metas por vendedor/cliente
app.get('/api/metas-vendedor-cliente', auth, async (req, res) => {
    try {
        const { vendedor_id, cliente_primario_id, mes, ano } = req.query;
        let query = `
            SELECT mvc.*, v.nome as vendedor_nome, c.nome as cliente_nome
            FROM metas_vendedor_cliente mvc
            LEFT JOIN vendedores v ON mvc.vendedor_id = v.id
            LEFT JOIN clientes c ON mvc.cliente_primario_id = c.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;
        
        if (vendedor_id) { paramCount++; query += ` AND mvc.vendedor_id = $${paramCount}`; params.push(vendedor_id); }
        if (cliente_primario_id) { paramCount++; query += ` AND mvc.cliente_primario_id = $${paramCount}`; params.push(cliente_primario_id); }
        if (mes) { paramCount++; query += ` AND mvc.mes = $${paramCount}`; params.push(mes); }
        if (ano) { paramCount++; query += ` AND mvc.ano = $${paramCount}`; params.push(ano); }
        
        query += ' ORDER BY v.nome, c.nome';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar metas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar/Atualizar meta (upsert)
app.post('/api/metas-vendedor-cliente', auth, async (req, res) => {
    try {
        const { vendedor_id, cliente_primario_id, mes, ano, meta_doacoes, meta_valor, meta_ligacoes } = req.body;
        const result = await pool.query(`
            INSERT INTO metas_vendedor_cliente (vendedor_id, cliente_primario_id, mes, ano, meta_doacoes, meta_valor, meta_ligacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (vendedor_id, cliente_primario_id, mes, ano)
            DO UPDATE SET meta_doacoes = $5, meta_valor = $6, meta_ligacoes = $7
            RETURNING *
        `, [vendedor_id, cliente_primario_id, mes, ano, meta_doacoes || 0, meta_valor || 0, meta_ligacoes || 0]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao salvar meta:', error);
        res.status(500).json({ error: error.message });
    }
});

// Deletar meta
app.delete('/api/metas-vendedor-cliente/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM metas_vendedor_cliente WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Progresso das metas (realizado vs meta)
app.get("/api/metas-vendedor-cliente/progresso", auth, async (req, res) => {
    try {
        const { vendedor_id, mes, ano } = req.query;
    console.log("[Conversas] vendedor_id recebido:", vendedor_id);
        const mesAtual = mes || (new Date().getMonth() + 1);
        const anoAtual = ano || new Date().getFullYear();
        
        let query = `
            SELECT 
                ml.id, ml.vendedor_id, ml.cliente_primario_id, ml.data_lote,
                ml.meta_qtd as meta_doacoes, ml.meta_valor, ml.meta_ligacoes,
                c.nome as cliente_nome,
                v.nome as vendedor_nome,
                (SELECT COUNT(*) FROM clientes_finais cf WHERE cf.vendedor_id = ml.vendedor_id AND cf.cliente_primario_id = ml.cliente_primario_id AND cf.created_at::date = ml.data_lote AND cf.status_contato = 'convertido') as realizado_doacoes,
                (SELECT COALESCE(SUM(valor_potencial),0) FROM clientes_finais cf WHERE cf.vendedor_id = ml.vendedor_id AND cf.cliente_primario_id = ml.cliente_primario_id AND cf.created_at::date = ml.data_lote AND cf.status_contato = 'convertido') as realizado_valor,
                0 as realizado_ligacoes
            FROM metas_lista ml
            LEFT JOIN clientes c ON c.id = ml.cliente_primario_id
            LEFT JOIN vendedores v ON v.id = ml.vendedor_id
            WHERE EXTRACT(MONTH FROM ml.data_lote) = $1 AND EXTRACT(YEAR FROM ml.data_lote) = $2
            ORDER BY ml.data_lote DESC
        `;
        const result = await pool.query(query, [mesAtual, anoAtual]);
        res.json(result.rows);
    } catch (error) {
        console.error("Erro ao buscar progresso:", error);
        res.status(500).json({ error: error.message });
    }
});
app.patch('/api/vendedores/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;
        
        // Atualizar status do vendedor
        await pool.query('UPDATE vendedores SET ativo = $1 WHERE id = $2', [ativo, id]);
        
        // Se inativando, também inativar o usuário vinculado
        if (!ativo) {
            await pool.query('UPDATE usuarios SET status = $1 WHERE id = (SELECT usuario_id FROM vendedores WHERE id = $2)', ['inativo', id]);
        }
        
        res.json({ success: true, message: ativo ? 'Vendedor ativado!' : 'Vendedor inativado!' });
    } catch (error) {
        console.error('Erro ao alterar status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Excluir vendedor (se realmente quiser deletar)
app.delete('/api/vendedores/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM vendedores WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir vendedor:', error);
        res.status(500).json({ error: error.message });
    }
});


// Inativar/Ativar usuário
app.patch('/api/usuarios/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { ativo } = req.body;
        
        // Atualizar status do usuário
        await pool.query('UPDATE usuarios SET status = $1 WHERE id = $2', [ativo ? 'ativo' : 'inativo', id]);
        
        // Se for vendedor, também atualizar na tabela vendedores
        await pool.query('UPDATE vendedores SET ativo = $1 WHERE usuario_id = $2', [ativo, id]);
        
        res.json({ success: true, message: ativo ? 'Usuário ativado!' : 'Usuário inativado!' });
    } catch (error) {
        console.error('Erro ao alterar status do usuário:', error);
        res.status(500).json({ error: error.message });
    }
});


// Inativar leads (soft delete) - preserva histórico
app.post('/api/leads/inativar', auth, async (req, res) => {
    try {
        const { ids, motivo } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Nenhum lead selecionado' });
        }
        
        const result = await pool.query(
            "UPDATE clientes_finais SET status = 'inativo', observacoes = COALESCE(observacoes, '') || ' | Inativado em ' || NOW()::date || ': ' || $2 WHERE id = ANY($1) RETURNING id",
            [ids, motivo || 'Cancelamento']
        );
        
        res.json({ success: true, message: result.rowCount + ' lead(s) inativado(s)', count: result.rowCount });
    } catch (error) {
        console.error('Erro ao inativar leads:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reativar leads
app.post('/api/leads/reativar', auth, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Nenhum lead selecionado' });
        }
        
        const result = await pool.query(
            "UPDATE clientes_finais SET status = 'novo' WHERE id = ANY($1) RETURNING id",
            [ids]
        );
        
        res.json({ success: true, message: result.rowCount + ' lead(s) reativado(s)', count: result.rowCount });
    } catch (error) {
        console.error('Erro ao reativar leads:', error);
        res.status(500).json({ error: error.message });
    }
});



// ==================== WHATSAPP QR CODE E CONEXAO ====================

// Obter QR Code para conectar
app.get('/api/whatsapp/qrcode', auth, async (req, res) => {
    try {
        if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
            return res.status(400).json({ error: 'Z-API nao configurada' });
        }
        const url = 'https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/qr-code';
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN } });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro ao obter QR Code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obter QR Code em base64 (imagem)
app.get('/api/whatsapp/qrcode-image', auth, async (req, res) => {
    try {
        if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
            return res.status(400).json({ error: 'Z-API nao configurada' });
        }
        const url = 'https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/qr-code/image';
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN } });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro ao obter QR Code imagem:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verificar status da conexao
app.get('/api/whatsapp/status', auth, async (req, res) => {
    try {
        if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
            return res.status(400).json({ error: 'Z-API nao configurada', connected: false });
        }
        const url = 'https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/status';
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN } });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({ error: error.message, connected: false });
    }
});

// Desconectar WhatsApp
app.get('/api/whatsapp/disconnect', auth, async (req, res) => {
    try {
        if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
            return res.status(400).json({ error: 'Z-API nao configurada' });
        }
        const url = 'https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/disconnect';
        const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': ZAPI_CLIENT_TOKEN } });
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Erro ao desconectar:', error);
        res.status(500).json({ error: error.message });
    }
});

// Reconectar WhatsApp
app.post('/api/whatsapp/restart', auth, async (req, res) => {
    try {
        if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
            return res.status(400).json({ error: 'Z-API nao configurada' });
        }
        const url = 'https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/restart';
        const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': ZAPI_CLIENT_TOKEN } });
        const data = await response.json();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Erro ao reiniciar:', error);
        res.status(500).json({ error: error.message });
    }
});


// ==================== WHATSAPP MULTI-NUMERO ====================

// Listar todas as instâncias
app.get('/api/whatsapp/instancias', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM whatsapp_instancias WHERE ativo = true ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Adicionar nova instância
app.post('/api/whatsapp/instancias', auth, async (req, res) => {
    try {
        const { nome, instance_id, token, client_token } = req.body;
        const result = await pool.query(
            'INSERT INTO whatsapp_instancias (nome, instance_id, token, client_token) VALUES ($1, $2, $3, $4) RETURNING *',
            [nome, instance_id, token, client_token || '']
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Atualizar instância
app.put('/api/whatsapp/instancias/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, instance_id, token, client_token, telefone } = req.body;
        const result = await pool.query(
            'UPDATE whatsapp_instancias SET nome = COALESCE($1, nome), instance_id = COALESCE($2, instance_id), token = COALESCE($3, token), client_token = COALESCE($4, client_token), telefone = COALESCE($5, telefone), updated_at = NOW() WHERE id = $6 RETURNING *',
            [nome, instance_id, token, client_token, telefone, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Excluir instância
app.delete('/api/whatsapp/instancias/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE whatsapp_instancias SET ativo = false WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter status de uma instância específica
app.get('/api/whatsapp/instancias/:id/status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
        if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
        
        const { instance_id, token, client_token } = inst.rows[0];
        const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/status';
        const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': client_token } });
        const data = await response.json();
        
        // Atualizar status no banco
        const status = data.connected ? 'conectado' : 'desconectado';
        const telefone = data.phone || null;
        await pool.query('UPDATE whatsapp_instancias SET status = $1, telefone = $2, updated_at = NOW() WHERE id = $3', [status, telefone, id]);
        
        res.json({ ...data, id, nome: inst.rows[0].nome });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obter QR Code de uma instância específica
app.get('/api/whatsapp/instancias/:id/qrcode', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
        if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
        
        const { instance_id, token, client_token } = inst.rows[0];
        const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/qr-code/image';
        const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': client_token } });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Desconectar uma instância específica
app.get('/api/whatsapp/instancias/:id/disconnect', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
        if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
        
        const { instance_id, token, client_token } = inst.rows[0];
        const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/disconnect';
        const response = await fetch(url, { method: 'GET', headers: { 'Client-Token': client_token } });
        const data = await response.json();
        
        await pool.query('UPDATE whatsapp_instancias SET status = $1, updated_at = NOW() WHERE id = $2', ['desconectado', id]);
        res.json({ success: true, ...data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enviar mensagem por uma instância específica
app.post('/api/whatsapp/instancias/:id/enviar', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { telefone, mensagem } = req.body;
        
        const inst = await pool.query('SELECT * FROM whatsapp_instancias WHERE id = $1', [id]);
        if (inst.rows.length === 0) return res.status(404).json({ error: 'Instância não encontrada' });
        
        const { instance_id, token, client_token } = inst.rows[0];
        const url = 'https://api.z-api.io/instances/' + instance_id + '/token/' + token + '/send-text';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Client-Token': client_token },
            body: JSON.stringify({ phone: telefone, message: mensagem })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Inativar cliente B2B (soft delete)
app.delete('/api/clientes/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE clientes SET ativo = false WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        res.json({ success: true, cliente: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Listar clientes B2B inativos
app.get('/api/clientes/inativos', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clientes WHERE ativo = false ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reativar cliente B2B
app.put('/api/clientes/:id/reativar', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE clientes SET ativo = true WHERE id = $1 RETURNING *',
            [id]
        );
        res.json({ success: true, cliente: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==================== DISTRIBUIÇÃO DE LEADS ====================

// Distribuir leads por quantidade (igual número de leads para cada vendedor)
app.post('/api/leads/distribuir/quantidade', auth, async (req, res) => {
    try {
        const { cliente_primario_id, vendedores_ids, apenas_sem_vendedor } = req.body;
        
        // Buscar leads sem vendedor
        let query = 'SELECT id FROM clientes_finais WHERE vendedor_id IS NULL';
        const params = [];
        if (cliente_primario_id) {
            params.push(cliente_primario_id);
            query += ' AND cliente_primario_id = $' + params.length;
        }
        query += ' ORDER BY id';
        
        const leadsResult = await pool.query(query, params);
        const leads = leadsResult.rows;
        
        if (leads.length === 0) {
            return res.json({ success: true, total: 0, message: 'Nenhum lead para distribuir' });
        }
        
        // Buscar vendedores ativos
        let vendedoresQuery = 'SELECT id FROM vendedores WHERE ativo = true';
        let vendedoresParams = [];
        if (vendedores_ids && vendedores_ids.length > 0) {
            vendedoresQuery += ' AND id = ANY($1)';
            vendedoresParams.push(vendedores_ids);
        }
        
        const vendedoresResult = await pool.query(vendedoresQuery, vendedoresParams);
        const vendedores = vendedoresResult.rows;
        
        if (vendedores.length === 0) {
            return res.status(400).json({ error: 'Nenhum vendedor disponível' });
        }
        
        // Distribuir igualmente
        let distribuidos = 0;
        for (let i = 0; i < leads.length; i++) {
            const vendedor = vendedores[i % vendedores.length];
            await pool.query('UPDATE clientes_finais SET vendedor_id = $1 WHERE id = $2', [vendedor.id, leads[i].id]);
            distribuidos++;
        }
        
        res.json({ success: true, total: distribuidos, vendedores: vendedores.length });
    } catch (error) {
        console.error('Erro ao distribuir:', error);
        res.status(500).json({ error: error.message });
    }
});

// Distribuir leads por valor (equaliza valor total para cada vendedor)
app.post('/api/leads/distribuir/valor', auth, async (req, res) => {
    try {
        const { cliente_primario_id, vendedores_ids, apenas_sem_vendedor } = req.body;
        
        // Buscar leads sem vendedor ordenados por valor decrescente
        let query = 'SELECT id, valor_potencial as valor FROM clientes_finais WHERE vendedor_id IS NULL';
        const params = [];
        if (cliente_primario_id) {
            params.push(cliente_primario_id);
            query += ' AND cliente_primario_id = $' + params.length;
        }
        query += ' ORDER BY COALESCE(valor_potencial, 0) DESC';
        
        const leadsResult = await pool.query(query, params);
        const leads = leadsResult.rows;
        
        if (leads.length === 0) {
            return res.json({ success: true, total: 0, message: 'Nenhum lead para distribuir' });
        }
        
        // Buscar vendedores ativos
        let vendedoresQuery = 'SELECT id FROM vendedores WHERE ativo = true';
        let vendedoresParams = [];
        if (vendedores_ids && vendedores_ids.length > 0) {
            vendedoresQuery += ' AND id = ANY($1)';
            vendedoresParams.push(vendedores_ids);
        }
        
        const vendedoresResult = await pool.query(vendedoresQuery, vendedoresParams);
        const vendedores = vendedoresResult.rows.map(v => ({ id: v.id, valorTotal: 0 }));
        
        if (vendedores.length === 0) {
            return res.status(400).json({ error: 'Nenhum vendedor disponível' });
        }
        
        // Distribuir por valor (algoritmo guloso - atribui ao vendedor com menor valor acumulado)
        let distribuidos = 0;
        for (const lead of leads) {
            // Encontrar vendedor com menor valor acumulado
            vendedores.sort((a, b) => a.valorTotal - b.valorTotal);
            const vendedor = vendedores[0];
            
            await pool.query('UPDATE clientes_finais SET vendedor_id = $1 WHERE id = $2', [vendedor.id, lead.id]);
            vendedor.valorTotal += parseFloat(lead.valor) || 0;
            distribuidos++;
        }
        
        res.json({ success: true, total: distribuidos, vendedores: vendedores.length });
    } catch (error) {
        console.error('Erro ao distribuir por valor:', error);
        res.status(500).json({ error: error.message });
    }
});


// API para buscar valor total de leads por vendedor
app.get('/api/leads/totais-por-vendedor', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                vendedor_id, 
                COUNT(*) as qtd_leads, 
                COALESCE(SUM(valor_potencial), 0) as valor_total 
            FROM clientes_finais 
            WHERE (status != 'inativo' OR status IS NULL)
            GROUP BY vendedor_id
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar leads por vendedor:', error);
        res.status(500).json({ error: 'Erro ao buscar leads' });
    }
});

// API para buscar lotes de leads (agrupado por vendedor, cliente, data)
app.get('/api/leads/lotes', auth, async (req, res) => {
    try {
        const { vendedor_id, mes, ano } = req.query;
    console.log("[Conversas] vendedor_id recebido:", vendedor_id);
        let query = `
            SELECT 
                cf.vendedor_id,
                v.nome as vendedor_nome,
                cf.cliente_primario_id,
                c.nome as cliente_nome,
                cf.created_at::date as data_lote,
                COUNT(*) as qtd_leads,
                SUM(cf.valor_potencial) as valor_total,
                ml.meta_valor,
                ml.meta_qtd,
                ml.id as meta_id
            FROM clientes_finais cf
            LEFT JOIN clientes c ON c.id = cf.cliente_primario_id
            LEFT JOIN vendedores v ON v.id = cf.vendedor_id
            LEFT JOIN metas_lista ml ON ml.vendedor_id = cf.vendedor_id 
                AND ml.cliente_primario_id = cf.cliente_primario_id 
                AND ml.data_lote = cf.created_at::date
            WHERE cf.vendedor_id IS NOT NULL AND (cf.status IS NULL OR cf.status != 'inativo')
        `;
        const params = [];
        if (vendedor_id) {
            params.push(vendedor_id);
            query += ` AND cf.vendedor_id = $${params.length}`;
        }
        query += ` GROUP BY cf.vendedor_id, v.nome, cf.cliente_primario_id, c.nome, cf.created_at::date, ml.meta_valor, ml.meta_qtd, ml.id
                   ORDER BY cf.vendedor_id, data_lote DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar lotes:', error);
        res.status(500).json({ error: 'Erro ao buscar lotes' });
    }
});

// API para salvar meta de um lote
app.post("/api/leads/lotes/meta", auth, async (req, res) => {
    try {
        const { vendedor_id, cliente_primario_id, data_lote, meta_valor, meta_qtd, meta_ligacoes, qtd_leads, valor_leads } = req.body;
        const result = await pool.query(`
            INSERT INTO metas_lista (vendedor_id, cliente_primario_id, data_lote, qtd_leads, valor_leads, meta_valor, meta_qtd, meta_ligacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (vendedor_id, cliente_primario_id, data_lote) 
            DO UPDATE SET meta_valor = $6, meta_qtd = $7, meta_ligacoes = $8, qtd_leads = $4, valor_leads = $5
            RETURNING *
        `, [vendedor_id, cliente_primario_id, data_lote, qtd_leads, valor_leads, meta_valor, meta_qtd, meta_ligacoes || 0]);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Erro ao salvar meta:", error);
        res.status(500).json({ error: "Erro ao salvar meta" });
    }
});

// API UNIFICADA - Buscar progresso de metas por lote
app.get('/api/metas-lote/progresso', auth, async (req, res) => {
    try {
        const { vendedor_id, mes, ano } = req.query;
    console.log("[Conversas] vendedor_id recebido:", vendedor_id);
        const mesAtual = new Date().getMonth() + 1;
        const anoAtual = new Date().getFullYear();
        
        // Buscar metas por lote
        let query = `
            SELECT 
                ml.*,
                c.nome as cliente_nome,
                v.nome as vendedor_nome,
                (SELECT COUNT(*) FROM clientes_finais cf 
                 WHERE cf.vendedor_id = ml.vendedor_id 
                 AND cf.cliente_primario_id = ml.cliente_primario_id 
                 AND cf.created_at::date = ml.data_lote
                 AND cf.status = 'convertido') as realizadas,
                (SELECT COUNT(*) FROM clientes_finais cf 
                 WHERE cf.vendedor_id = ml.vendedor_id 
                 AND cf.cliente_primario_id = ml.cliente_primario_id 
                 AND cf.created_at::date = ml.data_lote) as total_leads
            FROM metas_lista ml
            LEFT JOIN clientes c ON c.id = ml.cliente_primario_id
            LEFT JOIN vendedores v ON v.id = ml.vendedor_id
            WHERE 1=1
        `;
        const params = [];
        if (vendedor_id) {
            params.push(vendedor_id);
            query += ` AND ml.vendedor_id = $${params.length}`;
        }
        query += ' ORDER BY ml.data_lote DESC';
        
        const result = await pool.query(query, params);
        
        // Calcular totais
        let totalMeta = 0, totalRealizado = 0, totalLeads = 0;
        const lotes = result.rows.map(r => {
            totalMeta += parseFloat(r.meta_valor || 0);
            totalRealizado += parseInt(r.realizadas || 0);
            totalLeads += parseInt(r.total_leads || 0);
            return {
                ...r,
                percentual: r.meta_qtd > 0 ? Math.round((r.realizadas / r.meta_qtd) * 100) : 0
            };
        });
        
        res.json({
            lotes,
            totais: {
                meta_valor: totalMeta,
                total_leads: totalLeads,
                realizadas: totalRealizado,
                percentual: totalLeads > 0 ? Math.round((totalRealizado / totalLeads) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Erro ao buscar progresso metas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Salvar meta para TODOS vendedores de um cliente/data
app.post('/api/metas-lista/todos', auth, async (req, res) => {
    try {
        const { cliente_primario_id, data_lote, meta_valor, meta_doacoes } = req.body;
        
        // Buscar todos os lotes de leads para esse cliente/data
        const lotes = await pool.query(`
            SELECT vendedor_id, cliente_primario_id, created_at::date as data_lote, 
                   COUNT(*) as qtd_leads, COALESCE(SUM(valor_potencial), 0) as valor_leads
            FROM clientes_finais 
            WHERE cliente_primario_id = $1 AND created_at::date = $2 
            GROUP BY vendedor_id, cliente_primario_id, created_at::date
        `, [cliente_primario_id, data_lote]);
        
        if (lotes.rows.length === 0) {
            return res.status(404).json({ error: 'Nenhum lote encontrado' });
        }
        
        // Inserir/atualizar meta para cada vendedor
        for (const lote of lotes.rows) {
            await pool.query(`
                INSERT INTO metas_lista (vendedor_id, cliente_primario_id, data_lote, qtd_leads, valor_leads, meta_valor, meta_qtd)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (vendedor_id, cliente_primario_id, data_lote) 
                DO UPDATE SET meta_valor = $6, meta_qtd = $7, qtd_leads = $4, valor_leads = $5
            `, [lote.vendedor_id, cliente_primario_id, data_lote, lote.qtd_leads, lote.valor_leads, meta_valor || 0, meta_doacoes || 0]);
        }
        
        res.json({ success: true, vendedores_atualizados: lotes.rows.length });
    } catch (error) {
        console.error('Erro ao salvar metas:', error);
        res.status(500).json({ error: error.message });
    }
});

// API - Estatísticas WhatsApp
app.get('/api/whatsapp/estatisticas', auth, async (req, res) => {
    try {
        const { vendedor_id } = req.query;
        const hoje = new Date().toISOString().split('T')[0];
        
        // Estatísticas do dia - conversas únicas (por telefone)
        let queryHoje = `
            SELECT 
                COUNT(DISTINCT CASE WHEN direcao = 'enviada' THEN telefone END) as conversas_iniciadas,
                COUNT(DISTINCT CASE WHEN telefone IN (
                    SELECT DISTINCT m2.telefone FROM whatsapp_mensagens m2 
                    WHERE m2.direcao = 'recebida' 
                    AND m2.created_at::date = $1
                    AND m2.is_grupo = false
                    ${vendedor_id ? 'AND m2.vendedor_id = $2' : ''}
                ) AND direcao = 'enviada' THEN telefone END) as respondidas,
                COUNT(DISTINCT CASE WHEN direcao = 'enviada' AND telefone NOT IN (
                    SELECT DISTINCT m2.telefone FROM whatsapp_mensagens m2 
                    WHERE m2.direcao = 'recebida' 
                    AND m2.created_at::date = $1
                    AND m2.is_grupo = false
                    ${vendedor_id ? 'AND m2.vendedor_id = $2' : ''}
                ) THEN telefone END) as nao_respondidas
            FROM whatsapp_mensagens
            WHERE created_at::date = $1 AND is_grupo = false
            ${vendedor_id ? 'AND vendedor_id = $2' : ''}
        `;
        
        // Estatísticas do mês
        const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        let queryMes = `
            SELECT 
                COUNT(DISTINCT CASE WHEN direcao = 'enviada' THEN telefone END) as conversas_iniciadas,
                COUNT(DISTINCT CASE WHEN telefone IN (
                    SELECT DISTINCT m2.telefone FROM whatsapp_mensagens m2 
                    WHERE m2.direcao = 'recebida' 
                    AND m2.created_at::date >= $1
                    AND m2.is_grupo = false
                    ${vendedor_id ? 'AND m2.vendedor_id = $2' : ''}
                ) AND direcao = 'enviada' THEN telefone END) as respondidas
            FROM whatsapp_mensagens
            WHERE created_at::date >= $1 AND is_grupo = false
            ${vendedor_id ? 'AND vendedor_id = $2' : ''}
        `;
        
        const paramsHoje = vendedor_id ? [hoje, vendedor_id] : [hoje];
        const paramsMes = vendedor_id ? [primeiroDiaMes, vendedor_id] : [primeiroDiaMes];
        
        const resultHoje = await pool.query(queryHoje, paramsHoje);
        const resultMes = await pool.query(queryMes, paramsMes);
        
        const hojeStats = resultHoje.rows[0] || { conversas_iniciadas: 0, respondidas: 0, nao_respondidas: 0 };
        const mesStats = resultMes.rows[0] || { conversas_iniciadas: 0, respondidas: 0 };
        
        res.json({
            hoje: {
                conversas: parseInt(hojeStats.conversas_iniciadas) || 0,
                respondidas: parseInt(hojeStats.respondidas) || 0,
                naoRespondidas: parseInt(hojeStats.nao_respondidas) || 0,
                taxaResposta: hojeStats.conversas_iniciadas > 0 ? Math.round((hojeStats.respondidas / hojeStats.conversas_iniciadas) * 100) : 0
            },
            mes: {
                conversas: parseInt(mesStats.conversas_iniciadas) || 0,
                respondidas: parseInt(mesStats.respondidas) || 0,
                taxaResposta: mesStats.conversas_iniciadas > 0 ? Math.round((mesStats.respondidas / mesStats.conversas_iniciadas) * 100) : 0
            }
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas WhatsApp:', error);
        res.status(500).json({ error: error.message });
    }
});

// Enviar vídeo via WhatsApp
app.post('/api/whatsapp/enviar-video', auth, async (req, res) => {
  try {
    const { telefone, videoUrl, lead_id, vendedor_id, caption, nome_contato } = req.body;
    if (!telefone || !videoUrl) return res.status(400).json({ error: 'Telefone e vídeo obrigatórios' });
    
    let tel = telefone;
    if (tel.includes("@") || tel.includes("-group") || tel.length > 15) {
        // Grupo ou LID - manter original
    } else {
        tel = tel.replace(/\D/g, "");
        if (tel.length > 0 && tel.substring(0,2) !== "55") tel = "55" + tel;
    }
    
    const fetch = require('node-fetch');
    const response = await fetch('https://api.z-api.io/instances/' + ZAPI_INSTANCE_ID + '/token/' + ZAPI_TOKEN + '/send-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': 'F4cb60f10f1a94c1d999839ef72ca6f4bS' },
      body: JSON.stringify({ phone: tel, video: videoUrl, caption: caption || '' })
    });
    
    const result = await response.json();
    console.log('Envio video:', result);
    
    if (result.zapiId || result.messageId) {
      await pool.query(
        "INSERT INTO whatsapp_mensagens (message_id, telefone, nome_contato, mensagem, tipo, direcao, lead_id, vendedor_id, status, arquivo_url) VALUES ($1, $2, $3, $4, 'video', 'enviada', $5, $6, 'enviada', $7)",
        [result.zapiId || result.messageId, tel, nome_contato || "", caption || "[Vídeo]", lead_id || null, vendedor_id || null, videoUrl]
      );
      if (lead_id) { await pool.query("UPDATE clientes_finais SET ultima_interacao = NOW() WHERE id = $1", [lead_id]); }
      res.json({ success: true, messageId: result.zapiId || result.messageId });
    } else {
      res.status(400).json({ error: 'Erro ao enviar vídeo', details: result });
    }
  } catch (error) {
    console.error('Erro enviar video:', error);
    res.status(500).json({ error: 'Erro ao enviar vídeo' });
  }
});
