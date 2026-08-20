/* Shell: sidebar, search, and the lesson pane. */

const StaticCode = ({ code }) => <CodeBlock code={code} />;

const VersionPill = ({ topic }) => {
    if (!topic.since) return null;
    return <span className="version-pill ml-2">new in {topic.since}</span>;
};

const Sidebar = ({ activeId, setActiveId, query, setQuery, open, setOpen }) => {
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return TOPICS;
        return TOPICS.filter((t) =>
            t.title.toLowerCase().includes(q)
            || t.category.toLowerCase().includes(q)
            || t.content.toLowerCase().includes(q)
            || t.code.toLowerCase().includes(q));
    }, [query]);

    const cats = CATEGORIES.filter((c) => filtered.some((t) => t.category === c));

    return (
        <div className={`w-full md:w-72 bg-gray-900 border-b md:border-b-0 md:border-r border-gray-700 flex flex-col ${
            open ? 'h-[60vh]' : 'h-auto'} md:h-full shrink-0`}>
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-blue-400">Godot 4.7 — 3D Handbook</h1>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {TOPICS.length} lessons · {Object.keys(DEMOS).length} interactive
                        </p>
                    </div>
                    <button className="md:hidden key-btn text-xs" onClick={() => setOpen(!open)}>
                        {open ? 'Hide' : 'Menu'}
                    </button>
                </div>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search lessons…"
                    className="mt-3 w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
            </div>
            <div className={`flex-1 overflow-y-auto p-2 ${open ? '' : 'hidden md:block'}`}>
                {cats.length === 0 && (
                    <p className="text-gray-500 text-sm p-3">No lesson matches “{query}”.</p>
                )}
                {cats.map((cat) => (
                    <div key={cat} className="mb-4">
                        <h3 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 px-2 mb-1.5">{cat}</h3>
                        <div className="space-y-0.5">
                            {filtered.filter((t) => t.category === cat).map((topic) => (
                                <button
                                    key={topic.id}
                                    onClick={() => { setActiveId(topic.id); setOpen(false); }}
                                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex items-center justify-between gap-2 ${
                                        activeId === topic.id
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    }`}
                                >
                                    <span className="truncate">{topic.title}</span>
                                    {DEMOS[topic.id] && (
                                        <span className={`text-[9px] shrink-0 ${
                                            activeId === topic.id ? 'text-blue-200' : 'text-gray-600'}`}>3D</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const App = () => {
    const [activeId, setActiveId] = useState(() => {
        const fromHash = window.location.hash.replace('#', '');
        return TOPICS.some((t) => t.id === fromHash) ? fromHash : 'intro';
    });
    const [query, setQuery] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const resetDemo = useCallback(() => setResetKey((k) => k + 1), []);

    const topic = TOPICS.find((t) => t.id === activeId) || TOPICS[0];
    const index = TOPICS.indexOf(topic);
    const DemoComponent = DEMOS[topic.id];

    useEffect(() => { window.location.hash = activeId; }, [activeId]);

    // Back/forward and pasted #deep-links should switch lessons too.
    useEffect(() => {
        const onHash = () => {
            const id = window.location.hash.replace('#', '');
            if (id && TOPICS.some((t) => t.id === id)) setActiveId(id);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    // Left/right arrows walk the lesson list when focus is not in a field.
    useEffect(() => {
        const onKey = (e) => {
            if (e.target.matches('input, textarea, select')) return;
            // A movement demo owns the arrow keys; it calls preventDefault on them.
            if (e.defaultPrevented) return;
            if (e.key === 'ArrowRight' && index < TOPICS.length - 1) setActiveId(TOPICS[index + 1].id);
            if (e.key === 'ArrowLeft' && index > 0) setActiveId(TOPICS[index - 1].id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [index]);

    const mainRef = useRef(null);
    useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; setResetKey(0); }, [activeId]);

    return (
        <div className="flex h-screen flex-col md:flex-row overflow-hidden">
            <Sidebar
                activeId={activeId} setActiveId={setActiveId}
                query={query} setQuery={setQuery}
                open={menuOpen} setOpen={setMenuOpen}
            />

            <div className="flex-1 flex flex-col min-h-0 bg-gray-900">
                <header className="p-5 md:p-6 border-b border-gray-800 shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">{topic.category}</span>
                            <VersionPill topic={topic} />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-white mt-1">{topic.title}</h2>
                        <p className="text-gray-400 mt-2 text-sm md:text-base leading-relaxed">{topic.content}</p>
                    </div>
                </header>

                <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#121212]">
                    <div className="max-w-4xl mx-auto">
                        {DemoComponent
                            ? (
                                <ResetContext.Provider value={resetDemo}>
                                    {/* Remounting is the reset: fresh scene, camera and controls. */}
                                    <DemoComponent key={topic.id + ':' + resetKey} />
                                </ResetContext.Provider>
                            )
                            : <StaticCode code={topic.code} />}

                        {DemoComponent && (
                            <details className="mt-6 panel">
                                <summary className="cursor-pointer text-sm font-bold text-gray-300 select-none">
                                    Full reference snippet
                                </summary>
                                <CodeBlock code={topic.code} />
                            </details>
                        )}

                        <div className="flex justify-between items-center mt-8 pb-4 gap-3">
                            <button
                                disabled={index === 0}
                                onClick={() => setActiveId(TOPICS[index - 1].id)}
                                className={`px-4 py-2 rounded text-sm font-bold ${
                                    index === 0 ? 'text-gray-700 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            >← {index > 0 ? TOPICS[index - 1].title : ''}</button>
                            <span className="text-xs text-gray-600 shrink-0">{index + 1} / {TOPICS.length}</span>
                            <button
                                disabled={index === TOPICS.length - 1}
                                onClick={() => setActiveId(TOPICS[index + 1].id)}
                                className={`px-4 py-2 rounded text-sm font-bold text-right ${
                                    index === TOPICS.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                            >{index < TOPICS.length - 1 ? TOPICS[index + 1].title : ''} →</button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

const bootEl = document.getElementById('boot-error');
if (bootEl) bootEl.remove();
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
