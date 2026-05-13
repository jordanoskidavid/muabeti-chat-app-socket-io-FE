'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

interface User {
    id: number;
    email: string;
}

interface Message {
    id: number;
    content: string;
    sender: User;
    createdAt: string;
}

interface Participant {
    id: number;
    userId: number;
    user: User;
}

interface Conversation {
    id: number;
    createdAt: string;
    participants: Participant[];
}

export default function ChatPage() {
    const router = useRouter();
    const tokenRef = useRef<string>('');
    const [currentUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
    });
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = localStorage.getItem('token');
        const u = localStorage.getItem('user');

        if (!t || !u) {
            router.push('/');
            return;
        }

        tokenRef.current = t;
        const currentUserId = JSON.parse(u).id;

        const socket = io('http://localhost:3000', {
            auth: { token: t },
        });
        socketRef.current = socket;

        socket.on('receiveMessage', (data: { from: number; message: string }) => {
            if (data.from === currentUserId) return;
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    content: data.message,
                    sender: { id: data.from, email: '' },
                    createdAt: new Date().toISOString(),
                },
            ]);
        });

        socket.on('messageSent', (data: { conversationId: number; message: string }) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now(),
                    content: data.message,
                    sender: { id: currentUserId, email: '' },
                    createdAt: new Date().toISOString(),
                },
            ]);
        });

        api.getConversations(t).then(setConversations);

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function selectConversation(conv: Conversation) {
        setSelectedConversation(conv);
        socketRef.current?.emit('joinConversation', { conversationId: conv.id });
        const msgs = await api.getMessages(tokenRef.current, conv.id);
        setMessages(msgs);
    }

    async function sendMessage() {
        if (!newMessage.trim() || !selectedConversation) return;
        socketRef.current?.emit('sendMessage', {
            conversationId: selectedConversation.id,
            message: newMessage,
        });
        setNewMessage('');
    }

    async function startConversation() {
        if (!newUserId.trim()) return;
        const conv = await api.createDirectConversation(tokenRef.current, Number(newUserId));
        if (conv.id) {
            setConversations((prev) => {
                const exists = prev.find((c) => c.id === conv.id);
                if (exists) return prev;
                return [conv, ...prev];
            });
            selectConversation(conv);
        }
        setNewUserId('');
    }

    function getOtherUser(conv: Conversation) {
        return conv.participants.find((p) => p.userId !== currentUser?.id)?.user;
    }

    function logout() {
        localStorage.clear();
        router.push('/');
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-72 bg-white border-r flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <span className="font-bold text-lg">Muabeti</span>
                    <button onClick={logout} className="text-sm text-red-500 hover:underline">
                        Logout
                    </button>
                </div>

                {/* New conversation */}
                <div className="p-3 border-b flex gap-2">
                    <input
                        type="number"
                        placeholder="User ID"
                        value={newUserId}
                        onChange={(e) => setNewUserId(e.target.value)}
                        className="border p-1 rounded w-full text-sm"
                    />
                    <button
                        onClick={startConversation}
                        className="bg-blue-500 text-white px-3 rounded text-sm hover:bg-blue-600"
                    >
                        Chat
                    </button>
                </div>

                {/* Conversations list */}
                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => {
                        const other = getOtherUser(conv);
                        return (
                            <div
                                key={conv.id}
                                onClick={() => selectConversation(conv)}
                                className={`p-4 cursor-pointer hover:bg-gray-100 border-b ${
                                    selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                                }`}
                            >
                                <p className="font-medium text-sm">{other?.email ?? 'Unknown'}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="p-3 border-t text-xs text-gray-500" suppressHydrationWarning>
                    {currentUser?.email}
                </div>
            </div>

            {/* Chat window */}
            <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                    <>
                        <div className="p-4 bg-white border-b font-medium">
                            {getOtherUser(selectedConversation)?.email ?? 'Chat'}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                                        msg.sender.id === currentUser?.id
                                            ? 'bg-blue-500 text-white self-end'
                                            : 'bg-white text-gray-800 self-start shadow'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t flex gap-2">
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                className="flex-1 border p-2 rounded"
                            />
                            <button
                                onClick={sendMessage}
                                className="bg-blue-500 text-white px-4 rounded hover:bg-blue-600"
                            >
                                Send
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Select a conversation to start chatting
                    </div>
                )}
            </div>
        </div>
    );
}