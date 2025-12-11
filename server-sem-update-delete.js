const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const SECRET = 'seu-secret-key-aqui-mudeme';

app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: 'localhost',
    database: 'sistema_gestao',
    user: 'postgres',
    password: 'postgres123',
    port: 5432
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.senha);

        if (!valid) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });
    
    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

const tables = ['usuarios', 'clientes', 'vendedores', 'vendas', 'ligacoes', 'equipes', 'clientes_finais'];

tables.forEach(table => {
    app.get('/api/' + table, async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM ' + table + ' ORDER BY id');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/' + table, auth, async (req, res) => {
        try {
            const keys = Object.keys(req.body);
            const values = Object.values(req.body);
            const placeholders = keys.map((_, i) => '$' + (i + 1)).join(', ');
            
            const query = 'INSERT INTO ' + table + ' (' + keys.join(', ') + ') VALUES (' + placeholders + ') RETURNING *';
            const result = await pool.query(query, values);
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/' + table + '/:id', auth, async (req, res) => {
        try {
            const { id } = req.params;
            const keys = Object.keys(req.body);
            const values = Object.values(req.body);
            const setClause = keys.map((key, i) => key + ' = $' + (i + 1)).join(', ');
            
            const query = 'UPDATE ' + table + ' SET ' + setClause + ' WHERE id = $' + (keys.length + 1) + ' RETURNING *';
            const result = await pool.query(query, [...values, id]);
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log('Backend rodando na porta ' + PORT));
