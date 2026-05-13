const BASE_URL = 'http://localhost:3000';

export const api = {
    async login(email: string, password: string) {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return res.json();
    },

    async register(email: string, password: string) {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return res.json();
    },
    async getConversations(token: string) {
        const res = await fetch(`${BASE_URL}/conversations`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log('conversations:', data);
        return data;
    },

    async getMessages(token: string, conversationId: number) {
        const res = await fetch(`${BASE_URL}/messages/${conversationId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.json();
    },

    async createDirectConversation(token: string, userId: number) {
        const res = await fetch(`${BASE_URL}/conversations/direct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
        });
        return res.json();
    },
};