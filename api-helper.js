// API Helper - Substitui o Supabase
const API_BASE = '/api';

const api = {
    // Usuários
    async getUsuarios() {
        const res = await fetch(`${API_BASE}/usuarios`);
        return await res.json();
    },
    
    async addUsuario(data) {
        const res = await fetch(`${API_BASE}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Clientes
    async getClientes() {
        const res = await fetch(`${API_BASE}/clientes`);
        return await res.json();
    },
    
    async addCliente(data) {
        const res = await fetch(`${API_BASE}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Clientes Finais
    async getClientesFinais() {
        const res = await fetch(`${API_BASE}/clientes_finais`);
        return await res.json();
    },
    
    async addClienteFinal(data) {
        const res = await fetch(`${API_BASE}/clientes_finais`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Vendedores
    async getVendedores() {
        const res = await fetch(`${API_BASE}/vendedores`);
        return await res.json();
    },
    
    async addVendedor(data) {
        const res = await fetch(`${API_BASE}/vendedores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Equipes
    async getEquipes() {
        const res = await fetch(`${API_BASE}/equipes`);
        return await res.json();
    },
    
    async addEquipe(data) {
        const res = await fetch(`${API_BASE}/equipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Vendas
    async getVendas() {
        const res = await fetch(`${API_BASE}/vendas`);
        return await res.json();
    },
    
    async addVenda(data) {
        const res = await fetch(`${API_BASE}/vendas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Ligações
    async getLigacoes() {
        const res = await fetch(`${API_BASE}/ligacoes`);
        return await res.json();
    },
    
    async addLigacao(data) {
        const res = await fetch(`${API_BASE}/ligacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },
    
    // Metas
    async getMetas() {
        const res = await fetch(`${API_BASE}/metas`);
        return await res.json();
    },
    
    async addMeta(data) {
        const res = await fetch(`${API_BASE}/metas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    }
};
