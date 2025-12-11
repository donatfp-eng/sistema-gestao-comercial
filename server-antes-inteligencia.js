const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'sua_chave_secreta_aqui_mude_em_producao';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        initDB();
    }
});

function initDB() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            perfil TEXT DEFAULT 'vendedor'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cnpj TEXT,
            email TEXT,
            telefone TEXT,
            percentual_comissao REAL NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS clientes_finais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            whatsapp TEXT,
            email TEXT,
            cliente_primario_id INTEGER,
            FOREIGN KEY (cliente_primario_id) REFERENCES clientes(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS vendedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT,
            telefone TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            vendedor_id INTEGER,
            cliente_nome TEXT,
            vendedor_nome TEXT,
            valor_bruto REAL,
            valor_comissao REAL,
            data TEXT,
            faturada BOOLEAN DEFAULT 0,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ligacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            vendedor_id INTEGER,
            cliente_nome TEXT,
            vendedor_nome TEXT,
            data TEXT,
            status TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (vendedor_id) REFERENCES vendedores(id)
        )`);

        db.get("SELECT COUNT(*) as count FROM usuarios WHERE email = 'admin@empresa.com'", [], (err, row) => {
            if (err) {
                console.error('Erro ao verificar usuário admin:', err.message);
            } else if (row.count === 0) {
                const senhaHash = bcrypt.hashSync('admin123', 10);
                db.run("INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)",
                    ['Administrador', 'admin@empresa.com', senhaHash, 'admin'],
                    (err) => {
                        if (err) {
                            console.error('Erro ao criar usuário admin:', err.message);
                        } else {
                            console.log('Usuário admin criado com sucesso');
                        }
                    }
                );
            }
        });

        seedDataIfEmpty();
    });
}

function seedDataIfEmpty() {
    db.get("SELECT COUNT(*) as count FROM clientes", [], (err, row) => {
        if (!err && row.count === 0) {
            const clientes = [
                ['Tech Solutions LTDA', '12.345.678/0001-90', 'contato@techsolutions.com.br', '(11) 3333-4444', 10],
                ['Indústria ABC S/A', '98.765.432/0001-10', 'vendas@industriaabc.com.br', '(11) 2222-3333', 8],
                ['Comercial XYZ', '11.222.333/0001-44', 'comercial@xyz.com.br', '(11) 4444-5555', 12],
                ['Empresa Gamma LTDA', '55.666.777/0001-88', 'gamma@empresa.com', '(11) 5555-6666', 9]
            ];

            clientes.forEach(c => {
                db.run("INSERT INTO clientes (nome, cnpj, email, telefone, percentual_comissao) VALUES (?, ?, ?, ?, ?)", c);
            });

            const vendedores = [
                ['Carlos Silva', 'carlos@empresa.com', '(11) 98888-7777'],
                ['Ana Santos', 'ana@empresa.com', '(11) 97777-6666'],
                ['Carlos Vendedor', 'carlos.v@empresa.com', '(11) 96666-5555'],
                ['Vendedor 1', 'vendedor1@empresa.com', '(11) 95555-4444'],
                ['Vendedor 2', 'vendedor2@empresa.com', '(11) 94444-3333'],
                ['Ana Vendedora', 'ana.v@empresa.com', '(11) 93333-2222']
            ];

            vendedores.forEach(v => {
                db.run("INSERT INTO vendedores (nome, email, telefone) VALUES (?, ?, ?)", v);
            });

            const contatos = [
                ['João da Silva', '(11) 99111-1111', '(11) 99111-1111', 'joao.silva@techsolutions.com', 1],
                ['Maria Santos', '(11) 99222-2222', '(11) 99222-2222', 'maria.santos@techsolutions.com', 1],
                ['Pedro Alves', '(11) 99333-3333', '(11) 99333-3333', 'pedro@industriaabc.com', 2],
                ['Ana Costa', '(11) 99444-4444', '(11) 99444-4444', 'ana@industriaabc.com', 2],
                ['Carlos Mendes', '(11) 99555-5555', '(11) 99555-5555', 'carlos@xyz.com.br', 3],
                ['Fernanda Rocha', '(11) 99888-8888', '(11) 99888-8888', 'fernanda@beta.com.br', 3],
                ['Lucas Souza', '(11) 99999-9999', '(11) 99999-9999', 'lucas@gamma.com.br', 4],
                ['Julia Lima', '(11) 99666-6666', '(11) 99666-6666', 'julia@xyz.com.br', 3],
                ['Roberto Dias', '(11) 99777-7777', '(11) 09777-7777', 'roberto@beta.com.br', 3],
                ['Patricia Gomes', '(11) 99000-0000', '(11) 99000-0000', 'patricia@gamma.com.br', 4]
            ];

            contatos.forEach(c => {
                db.run("INSERT INTO clientes_finais (nome, telefone, whatsapp, email, cliente_primario_id) VALUES (?, ?, ?, ?, ?)", c);
            });

            const vendas = [
                [1, 1, 'Tech Solutions LTDA', 'Carlos Silva', 15000.00, 1500.00, '2024-11-01', 1],
                [1, 1, 'Tech Solutions LTDA', 'Carlos Silva', 8500.00, 850.00, '2024-11-05', 0],
                [2, 2, 'Indústria ABC S/A', 'Ana Santos', 25000.00, 2000.00, '2024-11-10', 1],
                [2, 2, 'Indústria ABC S/A', 'Ana Santos', 12000.00, 960.00, '2024-11-12', 1],
                [3, 1, 'Comercial XYZ', 'Carlos Silva', 18500.00, 2220.00, '2024-11-15', 0],
                [4, 2, 'Empresa Gamma LTDA', 'Ana Santos', 10000.00, 900.00, '2024-11-18', 0],
                [4, 2, 'Empresa Gamma LTDA', 'Ana Santos', 11500.00, 1035.00, '2024-11-19', 0],
                [1, 3, 'Tech Solutions LTDA', 'Carlos Vendedor', 21000.00, 2100.00, '2024-10-05', 1],
                [1, 3, 'Tech Solutions LTDA', 'Carlos Vendedor', 21000.00, 2100.00, '2024-10-15', 1],
                [2, 4, 'Indústria ABC S/A', 'Vendedor 1', 21000.00, 1680.00, '2024-10-20', 1],
                [2, 4, 'Indústria ABC S/A', 'Vendedor 1', 21000.00, 1680.00, '2024-09-10', 1],
                [3, 5, 'Comercial XYZ', 'Vendedor 2', 9200.00, 1104.00, '2024-09-15', 0],
                [3, 5, 'Comercial XYZ', 'Vendedor 2', 9200.00, 1104.00, '2024-08-20', 0],
                [4, 6, 'Empresa Gamma LTDA', 'Ana Vendedora', 12000.00, 1080.00, '2024-08-25', 0],
                [4, 6, 'Empresa Gamma LTDA', 'Ana Vendedora', 12000.00, 1080.00, '2024-07-30', 0],
                [1, 1, 'Tech Solutions LTDA', 'Carlos Silva', 1100.04, 110.00, '2024-07-01', 1],
                [2, 2, 'Indústria ABC S/A', 'Ana Santos', 12000.00, 960.00, '2024-06-05', 1],
                [3, 1, 'Comercial XYZ', 'Carlos Silva', 9200.00, 1104.00, '2024-06-10', 0],
                [4, 2, 'Empresa Gamma LTDA', 'Ana Santos', 10000.00, 900.00, '2024-05-15', 0],
                [1, 3, 'Tech Solutions LTDA', 'Carlos Vendedor', 21000.00, 2100.00, '2024-05-20', 1],
                [2, 4, 'Indústria ABC S/A', 'Vendedor 1', 21000.00, 1680.00, '2024-04-25', 1],
                [3, 5, 'Comercial XYZ', 'Vendedor 2', 9200.00, 1104.00, '2024-04-30', 0]
            ];

            vendas.forEach(v => {
                db.run("INSERT INTO vendas (cliente_id, vendedor_id, cliente_nome, vendedor_nome, valor_bruto, valor_comissao, data, faturada) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", v);
            });

            const ligacoes = [
                [1, 1, 'Tech Solutions LTDA', 'Carlos Silva', '2024-11-01', 'efetivada'],
                [2, 2, 'Indústria ABC S/A', 'Ana Santos', '2024-11-02', 'tentada'],
                [3, 1, 'Comercial XYZ', 'Carlos Silva', '2024-11-03', 'efetivada'],
                [4, 2, 'Empresa Gamma LTDA', 'Ana Santos', '2024-11-04', 'efetivada'],
                [1, 1, 'Tech Solutions LTDA', 'Carlos Silva', '2024-11-05', 'tentada'],
                [2, 2, 'Indústria ABC S/A', 'Ana Santos', '2024-11-06', 'efetivada']
            ];

            ligacoes.forEach(l => {
                db.run("INSERT INTO ligacoes (cliente_id, vendedor_id, cliente_nome, vendedor_nome, data, status) VALUES (?, ?, ?, ?, ?, ?)", l);
            });

            console.log('Dados de exemplo inseridos com sucesso!');
        }
    });
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get("SELECT * FROM usuarios WHERE email = ?", [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        if (bcrypt.compareSync(password, user.senha)) {
            const token = jwt.sign({ id: user.id, email: user.email, perfil: user.perfil }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    });
});

// ROTAS GET (SELECT)
app.get('/api/usuarios', authenticateToken, (req, res) => {
    db.all("SELECT id, nome, email, perfil FROM usuarios", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/clientes', authenticateToken, (req, res) => {
    db.all("SELECT * FROM clientes ORDER BY nome", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/clientes_finais', authenticateToken, (req, res) => {
    db.all("SELECT * FROM clientes_finais ORDER BY nome", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/vendedores', authenticateToken, (req, res) => {
    db.all("SELECT * FROM vendedores ORDER BY nome", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/vendas', authenticateToken, (req, res) => {
    db.all("SELECT * FROM vendas ORDER BY data DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/ligacoes', authenticateToken, (req, res) => {
    db.all("SELECT * FROM ligacoes ORDER BY data DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// ROTAS POST (INSERT)
app.post('/api/clientes', authenticateToken, (req, res) => {
    const { nome, cnpj, email, telefone, percentual_comissao } = req.body;
    db.run("INSERT INTO clientes (nome, cnpj, email, telefone, percentual_comissao) VALUES (?, ?, ?, ?, ?)",
        [nome, cnpj, email, telefone, percentual_comissao],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        }
    );
});

app.post('/api/clientes_finais', authenticateToken, (req, res) => {
    const { nome, telefone, whatsapp, email, cliente_primario_id } = req.body;
    db.run("INSERT INTO clientes_finais (nome, telefone, whatsapp, email, cliente_primario_id) VALUES (?, ?, ?, ?, ?)",
        [nome, telefone, whatsapp, email, cliente_primario_id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        }
    );
});

app.post('/api/vendas', authenticateToken, (req, res) => {
    const { cliente_id, vendedor_id, cliente_nome, vendedor_nome, valor_bruto, valor_comissao, data, faturada } = req.body;
    db.run("INSERT INTO vendas (cliente_id, vendedor_id, cliente_nome, vendedor_nome, valor_bruto, valor_comissao, data, faturada) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [cliente_id, vendedor_id, cliente_nome, vendedor_nome, valor_bruto, valor_comissao, data, faturada || 0],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        }
    );
});

app.post('/api/ligacoes', authenticateToken, (req, res) => {
    const { cliente_id, vendedor_id, cliente_nome, vendedor_nome, data, status } = req.body;
    db.run("INSERT INTO ligacoes (cliente_id, vendedor_id, cliente_nome, vendedor_nome, data, status) VALUES (?, ?, ?, ?, ?, ?)",
        [cliente_id, vendedor_id, cliente_nome, vendedor_nome, data, status],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ id: this.lastID });
            }
        }
    );
});

// ROTAS PUT (UPDATE)
app.put('/api/clientes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { nome, cnpj, email, telefone, percentual_comissao } = req.body;
    db.run("UPDATE clientes SET nome = ?, cnpj = ?, email = ?, telefone = ?, percentual_comissao = ? WHERE id = ?",
        [nome, cnpj, email, telefone, percentual_comissao, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ changes: this.changes });
            }
        }
    );
});

app.put('/api/clientes_finais/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    const fieldNames = Object.keys(fields);
    const fieldValues = Object.values(fields);
    
    const setClause = fieldNames.map(f => `${f} = ?`).join(', ');
    const sql = `UPDATE clientes_finais SET ${setClause} WHERE id = ?`;
    
    db.run(sql, [...fieldValues, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ changes: this.changes });
        }
    });
});

app.put('/api/vendas/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { cliente_id, vendedor_id, cliente_nome, vendedor_nome, valor_bruto, valor_comissao, faturada } = req.body;
    db.run("UPDATE vendas SET cliente_id = ?, vendedor_id = ?, cliente_nome = ?, vendedor_nome = ?, valor_bruto = ?, valor_comissao = ?, faturada = ? WHERE id = ?",
        [cliente_id, vendedor_id, cliente_nome, vendedor_nome, valor_bruto, valor_comissao, faturada ? 1 : 0, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ changes: this.changes });
            }
        }
    );
});

app.put('/api/ligacoes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { cliente_id, vendedor_id, cliente_nome, vendedor_nome, status } = req.body;
    db.run("UPDATE ligacoes SET cliente_id = ?, vendedor_id = ?, cliente_nome = ?, vendedor_nome = ?, status = ? WHERE id = ?",
        [cliente_id, vendedor_id, cliente_nome, vendedor_nome, status, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.json({ changes: this.changes });
            }
        }
    );
});

// ROTAS DELETE
app.delete('/api/clientes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM clientes WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ changes: this.changes });
        }
    });
});

app.delete('/api/clientes_finais/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM clientes_finais WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ changes: this.changes });
        }
    });
});

app.delete('/api/vendas/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM vendas WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ changes: this.changes });
        }
    });
});

app.delete('/api/ligacoes/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM ligacoes WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ changes: this.changes });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
