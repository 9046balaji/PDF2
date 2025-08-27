// EnhancedSearchComponent.js
// Standalone search component with direct add buttons

const EnhancedSearchComponent = () => {
    const [searchValue, setSearchValue] = React.useState('');
    const [results, setResults] = React.useState([]);
    const [message, setMessage] = React.useState('');
    const [showResults, setShowResults] = React.useState(false);
    
    // This list should match your available tools, or fetch from your tool categories
    const availableItems = React.useMemo(() => {
        // Extract all tool names from ALL_TOOLS (with defensive checking)
        if (!window.ALL_TOOLS || !Array.isArray(window.ALL_TOOLS)) {
            console.warn('ALL_TOOLS is not available or not an array');
            return [];
        }
        return window.ALL_TOOLS.map(tool => tool.name.toLowerCase());
    }, []);
    
    const handleSearch = (value) => {
        setSearchValue(value);
        setShowResults(true);
        
        if (!value.trim()) {
            setResults([]);
            setMessage('');
            setShowResults(false);
            return;
        }
        
        // Find matching tools with defensive checks
        if (!window.ALL_TOOLS || !Array.isArray(window.ALL_TOOLS)) {
            setResults([]);
            setMessage('Tool data not available');
            return;
        }
        
        // Find matching tools
        const matches = window.ALL_TOOLS.filter(tool => 
            (tool.name && tool.name.toLowerCase().includes(value.toLowerCase())) || 
            (tool.description && tool.description.toLowerCase().includes(value.toLowerCase()))
        );
        
        if (matches.length > 0) {
            setResults(matches);
            setMessage('');
        } else {
            setResults([]);
            setMessage(`No results found for "${value}"`);
        }
    };
    
    const handleAddItem = (toolId) => {
        // You can implement this to set the current tool or navigate to it
        setCurrentToolId(toolId);
        setShowResults(false);
    };
    
    const handleSuggestNewTool = () => {
        // This could be extended to open a form or submit a suggestion
        alert(`Your suggestion for "${searchValue}" has been recorded. Thanks for helping us improve!`);
        setShowResults(false);
        setSearchValue('');
    };
    
    return (
        <div className="relative">
            {/* Search input */}
            <div className="relative">
                <input
                    type="search"
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search for any tool (merge, split, pdf, images)..."
                    className="w-full pl-10 pr-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-500"
                />
                <div className="absolute left-3 top-3 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                </div>
            </div>
            
            {/* Results dropdown */}
            {showResults && (searchValue.trim() !== '') && (
                <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="p-2">
                            {results.map(tool => (
                                <div key={tool.id} className="p-2 hover:bg-gray-50 rounded flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{tool.name}</div>
                                        <div className="text-xs text-gray-500">{tool.description}</div>
                                    </div>
                                    <button 
                                        onClick={() => handleAddItem(tool.id)}
                                        className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center">
                            <p className="text-gray-600 mb-3">{message}</p>
                            <button 
                                onClick={handleSuggestNewTool}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Suggest "{searchValue}"
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Make the component available globally
window.EnhancedSearchComponent = EnhancedSearchComponent;

// Add console message to help debug loading
console.log('EnhancedSearchComponent loaded successfully');
