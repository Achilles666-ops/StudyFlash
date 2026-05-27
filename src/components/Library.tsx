import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Document } from '../types';
import { DocumentCard } from './DocumentCard';

export const Library = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'documents'), where('userId', '==', auth.currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
            setDocuments(docs);
        });
        return unsubscribe;
    }, []);

    const filteredDocs = documents.filter(doc => 
        doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const deleteDocument = async (id: string) => {
        if (confirm("Are you sure you want to delete this document?")) {
            await deleteDoc(doc(db, 'documents', id));
        }
    };

    return (
        <div className="space-y-6">
            <input 
                type="text" 
                placeholder="Search documents by name or subject..."
                className="w-full p-3 rounded-xl border border-[#E5E7EB]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="grid grid-cols-2 gap-6">
                {filteredDocs.map(doc => (
                    <DocumentCard key={doc.id} doc={doc} onDelete={deleteDocument} />
                ))}
            </div>
        </div>
    );
};
