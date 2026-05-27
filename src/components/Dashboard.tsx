export const Dashboard = () => {
    return (
        <div className="flex flex-col gap-8">
            <div className="greeting">
                <h1 className="text-2xl font-bold">Good morning, Alex 👋</h1>
                <p className="text-[#6B7280]">Ready to master your classes? Here is your study progress.</p>
            </div>
            
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: 'Documents', value: '24' },
                    { label: 'Flashcards', value: '842' },
                    { label: 'Studied Today', value: '3 Decks' },
                    { label: 'Avg. Mastery', value: '78.4%' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm">
                        <div className="text-[#6B7280] text-xs font-medium uppercase tracking-wider mb-2">{stat.label}</div>
                        <div className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
