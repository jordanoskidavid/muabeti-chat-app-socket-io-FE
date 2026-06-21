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
    name?: string;
    isGroup?: boolean;
    createdAt: string;
    participants: Participant[];
}

export default function ChatPage() {
    const router = useRouter();
    const tokenRef = useRef<string>('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [searchResults, setSearchResults] = useState<User[]>([]);

    // Group modal state
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [groupSearch, setGroupSearch] = useState('');
    const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);
    const [groupMembers, setGroupMembers] = useState<User[]>([]);

    useEffect(() => {
        const t = localStorage.getItem('token');
        const u = localStorage.getItem('user');

        if (!t || !u) {
            router.push('/');
            return;
        }

        tokenRef.current = t;
        const parsedUser = JSON.parse(u);
        setCurrentUser(parsedUser);          // ← add this line
        const currentUserId = parsedUser.id;

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

    async function createGroup() {
        if (!groupName.trim() || groupMembers.length === 0) return;
        const conv = await api.createGroupConversation(
            tokenRef.current,
            groupName,
            groupMembers.map((m) => m.id)
        );
        if (conv.id) {
            setConversations((prev) => [conv, ...prev]);
            selectConversation(conv);
        }
        setShowGroupModal(false);
        setGroupName('');
        setGroupMembers([]);
        setGroupSearch('');
        setGroupSearchResults([]);
    }

    function getConversationName(conv: Conversation) {
        if (conv.isGroup) return conv.name ?? 'Group';
        return getOtherUser(conv)?.email ?? 'Unknown';
    }

    function getConversationInitial(conv: Conversation) {
        if (conv.isGroup) return conv.name?.[0]?.toUpperCase() ?? 'G';
        return getInitial(getOtherUser(conv)?.email ?? '?');
    }

    function getOtherUser(conv: Conversation) {
        return conv.participants.find((p) => p.userId !== currentUser?.id)?.user;
    }

    function getInitial(email: string) {
        return email ? email[0].toUpperCase() : '?';
    }

    function logout() {
        localStorage.clear();
        router.push('/');
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f0f13', fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 4px; }
                .conv-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; transition: background 0.15s; border-radius: 10px; margin: 2px 8px; }
                .conv-item:hover { background: #1a1a24; }
                .conv-item.active { background: #1e1e2e; }
                .avatar { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 15px; flex-shrink: 0; background: linear-gradient(135deg, #6c63ff, #3ecfcf); color: white; }
                .avatar-group { background: linear-gradient(135deg, #f59e0b, #ef4444); }
                .avatar-sm { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; background: linear-gradient(135deg, #6c63ff, #3ecfcf); color: white; flex-shrink: 0; }
                .search-input { width: 100%; background: #1a1a24; border: 1px solid #2a2a38; border-radius: 10px; padding: 10px 14px; color: #e0e0f0; font-size: 13px; font-family: inherit; outline: none; transition: border 0.2s; }
                .search-input::placeholder { color: #555570; }
                .search-input:focus { border-color: #6c63ff; }
                .msg-input { flex: 1; background: #1a1a24; border: 1px solid #2a2a38; border-radius: 12px; padding: 12px 16px; color: #e0e0f0; font-size: 14px; font-family: inherit; outline: none; transition: border 0.2s; }
                .msg-input::placeholder { color: #555570; }
                .msg-input:focus { border-color: #6c63ff; }
                .send-btn { background: linear-gradient(135deg, #6c63ff, #4f46e5); border: none; border-radius: 12px; padding: 12px 20px; color: white; font-size: 14px; font-family: inherit; font-weight: 500; cursor: pointer; transition: opacity 0.2s, transform 0.1s; }
                .send-btn:hover { opacity: 0.9; transform: translateY(-1px); }
                .send-btn:active { transform: translateY(0); }
                .search-dropdown { position: absolute; left: 16px; right: 16px; top: calc(100% + 4px); background: #1e1e2e; border: 1px solid #2a2a38; border-radius: 10px; z-index: 50; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
                .search-result-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.15s; font-size: 13px; color: #c0c0d8; }
                .search-result-item:hover { background: #252535; }
                .bubble-mine { background: linear-gradient(135deg, #6c63ff, #4f46e5); color: white; align-self: flex-end; border-radius: 16px 16px 4px 16px; }
                .bubble-other { background: #1e1e2e; color: #d0d0e8; align-self: flex-start; border-radius: 16px 16px 16px 4px; border: 1px solid #2a2a38; }
                .logout-btn { background: none; border: 1px solid #2a2a38; border-radius: 8px; padding: 5px 12px; color: #888; font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
                .logout-btn:hover { border-color: #ff5566; color: #ff5566; }
                .group-btn { background: none; border: 1px solid #2a2a38; border-radius: 8px; padding: 5px 12px; color: #888; font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
                .group-btn:hover { border-color: #6c63ff; color: #6c63ff; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); }
                .modal { background: #13131a; border: 1px solid #1e1e2e; border-radius: 16px; padding: 28px; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 16px; }
                .modal-input { width: 100%; background: #1a1a24; border: 1px solid #2a2a38; border-radius: 10px; padding: 11px 14px; color: #e0e0f0; font-size: 13px; font-family: inherit; outline: none; transition: border 0.2s; }
                .modal-input::placeholder { color: #555570; }
                .modal-input:focus { border-color: #6c63ff; }
                .member-tag { display: flex; align-items: center; gap: 6px; background: #1e1e2e; border: 1px solid #2a2a38; border-radius: 8px; padding: 5px 10px; font-size: 12px; color: #c0c0d8; }
                .member-tag button { background: none; border: none; color: #555570; cursor: pointer; font-size: 14px; line-height: 1; }
                .member-tag button:hover { color: #ff5566; }
                .create-btn { background: linear-gradient(135deg, #6c63ff, #4f46e5); border: none; border-radius: 10px; padding: 12px; color: white; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: opacity 0.2s; }
                .create-btn:hover { opacity: 0.9; }
                .create-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .cancel-btn { background: none; border: 1px solid #2a2a38; border-radius: 10px; padding: 12px; color: #888; font-size: 14px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
                .cancel-btn:hover { border-color: #ff5566; color: #ff5566; }
            `}</style>

            {/* Group Modal */}
            {showGroupModal && (
                <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', color: '#e0e0f8' }}>Креирај група</p>

                        <input
                            className="modal-input"
                            type="text"
                            placeholder="име на групата..."
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />

                        <div style={{ position: 'relative' }}>
                            <input
                                className="modal-input"
                                type="text"
                                placeholder="🔍  пребарај членови..."
                                value={groupSearch}
                                onChange={async (e) => {
                                    setGroupSearch(e.target.value);
                                    if (e.target.value.trim().length < 2) { setGroupSearchResults([]); return; }
                                    const results = await api.searchUsers(tokenRef.current, e.target.value);
                                    setGroupSearchResults(results.filter((u: User) =>
                                        u.id !== currentUser?.id && !groupMembers.find((m) => m.id === u.id)
                                    ));
                                }}
                            />
                            {groupSearchResults.length > 0 && (
                                <div className="search-dropdown" style={{ position: 'absolute' }}>
                                    {groupSearchResults.map((user) => (
                                        <div
                                            key={user.id}
                                            className="search-result-item"
                                            onClick={() => {
                                                setGroupMembers((prev) => [...prev, user]);
                                                setGroupSearch('');
                                                setGroupSearchResults([]);
                                            }}
                                        >
                                            <div className="avatar-sm">{getInitial(user.email)}</div>
                                            {user.email}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {groupMembers.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {groupMembers.map((m) => (
                                    <div key={m.id} className="member-tag">
                                        {m.email}
                                        <button onClick={() => setGroupMembers((prev) => prev.filter((x) => x.id !== m.id))}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button className="cancel-btn" style={{ flex: 1 }} onClick={() => setShowGroupModal(false)}>cancel</button>
                            <button className="create-btn" style={{ flex: 1 }} onClick={createGroup} disabled={!groupName.trim() || groupMembers.length === 0}>
                                create →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div style={{ width: '280px', background: '#13131a', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1e1e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Муабети
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="logout-btn" onClick={logout}>Одјави се</button>
                    </div>
                </div>

                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e', position: 'relative' }}>
                    <input
                        className="search-input"
                        type="text"
                        placeholder="🔍  пребарај..."
                        value={newUserId}
                        onChange={async (e) => {
                            setNewUserId(e.target.value);
                            if (e.target.value.trim().length < 2) { setSearchResults([]); return; }
                            const results = await api.searchUsers(tokenRef.current, e.target.value);
                            setSearchResults(results.filter((u: User) => u.id !== currentUser?.id));
                        }}
                    />
                    <button
                        className="group-btn"
                        onClick={() => setShowGroupModal(true)}
                        style={{ width: '100%', padding: '8px',marginTop: '10px', borderRadius: '10px', fontSize: '12px', textAlign: 'center' }}
                    >
                        + нова група
                    </button>
                    {searchResults.length > 0 && (
                        <div className="search-dropdown">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="search-result-item"
                                    onClick={async () => {
                                        const conv = await api.createDirectConversation(tokenRef.current, user.id);
                                        if (conv.id) {
                                            setConversations((prev) => {
                                                const exists = prev.find((c) => c.id === conv.id);
                                                if (exists) return prev;
                                                return [conv, ...prev];
                                            });
                                            selectConversation(conv);
                                        }
                                        setNewUserId('');
                                        setSearchResults([]);
                                    }}
                                >
                                    <div className="avatar-sm">{getInitial(user.email)}</div>
                                    {user.email}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
                    {conversations.length === 0 && (
                        <p style={{ color: '#444458', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>no conversations yet</p>
                    )}
                    {conversations.map((conv) => {
                        const isActive = selectedConversation?.id === conv.id;
                        return (
                            <div key={conv.id} className={`conv-item ${isActive ? 'active' : ''}`} onClick={() => selectConversation(conv)}>
                                <div className={`avatar ${conv.isGroup ? 'avatar-group' : ''}`}>{getConversationInitial(conv)}</div>
                                <div style={{ overflow: 'hidden' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#e0e0f8' : '#a0a0b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getConversationName(conv)}
                                    </p>
                                    {conv.isGroup && (
                                        <p style={{ fontSize: '11px', color: '#444458', marginTop: '2px' }}>{conv.participants.length} members</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: '10px' }} suppressHydrationWarning>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3ecfcf, #6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'white' }}>
                        {getInitial(currentUser?.email ?? '')}
                    </div>
                    <span style={{ fontSize: '12px', color: '#555570', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</span>
                </div>
            </div>

            {/* Chat area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f0f13' }}>
                {selectedConversation ? (
                    <>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e1e2e', display: 'flex', alignItems: 'center', gap: '12px', background: '#13131a' }}>
                            <div className={`avatar ${selectedConversation.isGroup ? 'avatar-group' : ''}`}>
                                {getConversationInitial(selectedConversation)}
                            </div>
                            <div>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0f8' }}>{getConversationName(selectedConversation)}</p>
                                {selectedConversation.isGroup
                                    ? <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '1px' }}>● група · {selectedConversation.participants.length} членови</p>
                                    : <p style={{ fontSize: '11px', color: '#6c63ff', marginTop: '1px' }}>● активен/на</p>
                                }
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    style={{ display: 'flex', flexDirection: 'column', alignSelf: msg.sender.id === currentUser?.id ? 'flex-end' : 'flex-start', maxWidth: '60%', gap: '4px' }}
                                >
                                    {selectedConversation.isGroup && msg.sender.id !== currentUser?.id && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: 'white', flexShrink: 0 }}>
                                                {getInitial(selectedConversation.participants.find((p) => p.userId === msg.sender.id)?.user?.email ?? '?')}
                                            </div>
                                            <span style={{ fontSize: '11px', color: '#555570' }}>
                    {selectedConversation.participants.find((p) => p.userId === msg.sender.id)?.user?.email ?? 'unknown'}
                </span>
                                        </div>
                                    )}
                                    <div
                                        className={msg.sender.id === currentUser?.id ? 'bubble-mine' : 'bubble-other'}
                                        style={{ padding: '10px 16px', fontSize: '14px', lineHeight: '1.5' }}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #1e1e2e', display: 'flex', gap: '10px', background: '#13131a' }}>
                            <input
                                className="msg-input"
                                type="text"
                                placeholder="напиши порака..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button className="send-btn" onClick={sendMessage}>испрати →</button>
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #6c63ff, #3ecfcf)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>МУАБЕТИ</p>
                        <p style={{ color: '#333348', fontSize: '14px' }}>избери разговор и почни да комуницираш</p>
                    </div>
                )}
            </div>
        </div>
    );
}