// EnhancedPDFTools - Combines robust defensive programming with interactive search dropdown + recent searches + highlighting
const EnhancedPDFTools = ({
  allTools = [],
  onSelectTool = () => {},
  onSuggestTool = null,
  searchQuery = '',
  category = 'pdf',
  featuredToolIds = ['merge', 'split', 'compress', 'rotate']
}) => {
  const [localSearchQuery, setLocalSearchQuery] = React.useState('');
  const [showResults, setShowResults] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const [recentSearches, setRecentSearches] = React.useState(() => {
    try {
      const stored = localStorage.getItem('recentSearches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const searchRef = React.useRef(null);
  const resultsRef = React.useRef(null);

  // Prefer the global searchQuery when provided; otherwise use local
  const effectiveSearchQuery = (searchQuery || localSearchQuery).trim();

  // Defensive: ensure we always have an array to call .filter on
  const safeToolsArray = Array.isArray(allTools) ? allTools : [];

  // Filter tools by category and optional search query
  const filteredTools = React.useMemo(() => {
    const byCategory = safeToolsArray.filter(tool => tool && tool.category === category);
    if (!effectiveSearchQuery) return byCategory;
    const q = effectiveSearchQuery.toLowerCase();
    return byCategory.filter(tool => {
      const name = (tool && (tool.name || '')).toString().toLowerCase();
      const desc = (tool && (tool.description || '')).toString().toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [safeToolsArray, category, effectiveSearchQuery]);

  // Featured tools (defensive)
  const featuredTools = React.useMemo(() => {
    return safeToolsArray.filter(tool => (
      tool && featuredToolIds.includes(tool.id) && tool.category === category
    ));
  }, [safeToolsArray, featuredToolIds, category]);

  // Highlight search matches with regex escape for safety
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    try {
      // Escape special regex characters to prevent errors
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.toString().split(regex).map((part, i) =>
        regex.test(part) ? <mark key={i}>{part}</mark> : part
      );
    } catch (err) {
      // Fallback in case of any regex error
      console.error('Highlight error:', err);
      return text;
    }
  };

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) && 
          searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation for search results dropdown
  const handleKeyDown = (e) => {
    if (!showResults || !Array.isArray(filteredTools) || filteredTools.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < filteredTools.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredTools.length) {
          const selectedTool = filteredTools[focusedIndex];
          if (selectedTool && selectedTool.id) {
            handleSelectTool(selectedTool.id);
          }
        } else if (filteredTools.length === 0 && effectiveSearchQuery) {
          handleSuggestTool();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        break;
      default:
        break;
    }
  };

  const handleSelectTool = (id) => {
    onSelectTool(id);
    setShowResults(false);
    if (effectiveSearchQuery) {
      const updated = [effectiveSearchQuery, ...recentSearches.filter(s => s !== effectiveSearchQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    }
  };

  const handleSearchChange = (e) => {
    const value = (e && e.target && e.target.value) ? e.target.value : '';
    setLocalSearchQuery(value);
    if (value.trim()) {
      setShowResults(true);
      setFocusedIndex(-1);
    } else {
      setShowResults(false);
    }
  };

  const handleSearchFocus = () => {
    if (effectiveSearchQuery) {
      setShowResults(true);
    } else if (recentSearches.length > 0) {
      setShowResults(true);
    }
  };

  const handleSuggestTool = () => {
    if (!effectiveSearchQuery) return;
    if (typeof onSuggestTool === 'function') {
      try {
        onSuggestTool(effectiveSearchQuery);
      } catch (err) {
        console.error('onSuggestTool threw an error:', err);
        alert(`Suggestion received: "${effectiveSearchQuery}" (failed to call onSuggestTool)`);
      }
    } else {
      alert(`Your suggestion for "${effectiveSearchQuery}" has been recorded. Thanks for helping us improve!`);
    }
    setLocalSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="pdf-tools-container">
      <h2 className="text-2xl font-bold mb-6">PDF Tools</h2>
      {!searchQuery && (
        <div className="mb-6">
          <div className="relative">
            <input
              ref={searchRef}
              type="search"
              placeholder="Search PDF tools..."
              value={localSearchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring focus:ring-red-200 focus:border-red-500"
              aria-label="Search PDF tools"
              aria-expanded={showResults}
              aria-controls="search-results"
              aria-autocomplete="list"
              role="combobox"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
            </div>
            {showResults && (
              <div 
                ref={resultsRef}
                className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
                id="search-results"
                role="listbox"
              >
                {effectiveSearchQuery ? (
                  Array.isArray(filteredTools) && filteredTools.length > 0 ? (
                    <div className="p-2">
                      {filteredTools.map((tool, index) => (
                        <div
                          key={tool.id}
                          onClick={() => handleSelectTool(tool.id)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          className={`p-2 rounded flex justify-between items-center ${focusedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                          role="option"
                          aria-selected={focusedIndex === index}
                          tabIndex="-1"
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-red-500 flex-shrink-0">
                              {typeof tool.icon === 'string' ? <span style={{ fontSize: '24px' }}>{tool.icon}</span> : tool.icon}
                            </div>
                            <div>
                              <h4 className="font-medium">{highlightMatch(tool.name, effectiveSearchQuery)}</h4>
                              <p className="text-xs text-gray-500">{highlightMatch(tool.description, effectiveSearchQuery)}</p>
                            </div>
                          </div>
                          <button className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Select</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-gray-600 mb-3">No PDF tools found matching "{effectiveSearchQuery}"</p>
                      <button onClick={handleSuggestTool} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                        Suggest "{effectiveSearchQuery}"
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-2">
                    <p className="text-xs text-gray-500 mb-2">Recent searches</p>
                    {recentSearches.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => setLocalSearchQuery(s)}
                        className="p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured tools section */}
      {!effectiveSearchQuery && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredTools && featuredTools.length > 0 ? (
              featuredTools.map(tool => (
                <div
                  key={tool.id}
                  onClick={() => handleSelectTool(tool.id)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all cursor-pointer text-center"
                  role="button"
                  tabIndex="0"
                  aria-label={`Use ${tool.name} tool`}
                >
                  <div className="text-red-500 mb-2 flex justify-center">
                    {typeof tool.icon === 'string' ? <span style={{ fontSize: '24px' }} aria-hidden="true">{tool.icon}</span> : tool.icon}
                  </div>
                  <h4 className="font-medium">{tool.name}</h4>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No featured tools for this category.</div>
            )}
          </div>
        </div>
      )}

      {/* All PDF tools or search results (only shown when dropdown isn't active) */}
      {(!showResults || !effectiveSearchQuery) && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {effectiveSearchQuery ? 'Search Results' : 'All PDF Tools'}
          </h3>

          {Array.isArray(filteredTools) && filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map(tool => (
                <div
                  key={tool.id}
                  onClick={() => handleSelectTool(tool.id)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-red-200 transition-all cursor-pointer"
                  role="button"
                  tabIndex="0"
                  aria-label={`Use ${tool.name} tool`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectTool(tool.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-red-500 flex-shrink-0">
                      {typeof tool.icon === 'string' ? (
                        <span style={{ fontSize: '24px' }} aria-hidden="true">{tool.icon}</span>
                      ) : (
                        tool.icon
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{tool.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-4">No PDF tools found matching "{effectiveSearchQuery}"</p>
              <button
                onClick={handleSuggestTool}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Suggest "{effectiveSearchQuery}" as a new tool
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// PropTypes definitions - check if PropTypes is available in the window
if (window.PropTypes) {
  EnhancedPDFTools.propTypes = {
    allTools: window.PropTypes.array,
    onSelectTool: window.PropTypes.func,
    onSuggestTool: window.PropTypes.func,
    searchQuery: window.PropTypes.string,
    category: window.PropTypes.string,
    featuredToolIds: window.PropTypes.array
  };
}

// Make the component available globally for the app.js to use
window.EnhancedPDFTools = EnhancedPDFTools;

// Add console message to help debug loading
console.log('EnhancedPDFTools component loaded successfully');
