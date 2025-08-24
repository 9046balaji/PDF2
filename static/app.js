// Enhanced PDF Tool with PostgreSQL and User Authentication

const API_BASE_URL = window.location.origin;

// Tool Configuration
const toolConfig = {
    'merge': {
        title: 'Merge PDFs',
        description: 'Combine multiple PDF files into one document',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        allowMultiple: true,
        options: []
    },
    'split': {
        title: 'Split PDF',
        description: 'Split a PDF into multiple files by pages',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'pages',
                label: 'Page Range (e.g., 1-3,5,7-9)',
                type: 'text',
                placeholder: 'Leave empty to split every page'
            }
        ]
    },
    'compress': {
        title: 'Compress PDF',
        description: 'Reduce PDF file size while maintaining quality',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'quality',
                label: 'Compression Quality',
                type: 'select',
                choices: [
                    { value: 'low', label: 'Low (smaller file)' },
                    { value: 'medium', label: 'Medium (balanced)' },
                    { value: 'high', label: 'High (better quality)' }
                ]
            }
        ]
    },
    'rotate': {
        title: 'Rotate PDF',
        description: 'Rotate PDF pages by 90, 180, or 270 degrees',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'angle',
                label: 'Rotation Angle',
                type: 'select',
                choices: [
                    { value: '90', label: '90° Clockwise' },
                    { value: '180', label: '180°' },
                    { value: '270', label: '270° Clockwise' }
                ]
            }
        ]
    },
    // --- NEW ADVANCED FEATURES ---
    'pdf_to_word': {
        title: 'PDF to Word',
        description: 'Convert your PDF files to editable DOCX documents',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        allowMultiple: false,
        options: []
    },
    'pdf_to_excel': {
        title: 'PDF to Excel',
        description: 'Extract tables from PDF and convert to Excel spreadsheet',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M8 13V7"/><path d="M12 13V7"/><path d="M16 13V7"/></svg>,
        allowMultiple: false,
        options: []
    },
    'pdf_to_jpg': {
        title: 'PDF to JPG',
        description: 'Convert PDF pages to high-quality JPG images',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'pages',
                label: 'Pages to Convert',
                type: 'text',
                placeholder: 'Leave empty for all pages (e.g., 1,3,5-7)'
            },
            {
                id: 'dpi',
                label: 'Image Quality (DPI)',
                type: 'select',
                choices: [
                    { value: '100', label: '100 DPI (smaller files)' },
                    { value: '150', label: '150 DPI (balanced)' },
                    { value: '300', label: '300 DPI (high quality)' }
                ]
            }
        ]
    },
    'protect': {
        title: 'Protect PDF',
        description: 'Add password protection and encrypt your PDF file',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'password',
                label: 'Set Password',
                type: 'password',
                placeholder: 'Enter your password'
            }
        ]
    },
    'unlock': {
        title: 'Unlock PDF',
        description: 'Remove password protection from encrypted PDFs',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M12 11v6"/><path d="M12 11l-2-2"/><path d="M12 11l2-2"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'password',
                label: 'PDF Password',
                type: 'password',
                placeholder: 'Enter the PDF password'
            }
        ]
    },
    'watermark': {
        title: 'Add Watermark',
        description: 'Stamp text or image watermarks over your PDF',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'text',
                label: 'Watermark Text',
                type: 'text',
                placeholder: 'e.g., CONFIDENTIAL, DRAFT, etc.'
            },
            {
                id: 'opacity',
                label: 'Opacity Level',
                type: 'select',
                choices: [
                    { value: '0.1', label: 'Very Light (10%)' },
                    { value: '0.3', label: 'Light (30%)' },
                    { value: '0.5', label: 'Medium (50%)' },
                    { value: '0.7', label: 'Dark (70%)' }
                ]
            }
        ]
    },
    'page_numbers': {
        title: 'Add Page Numbers',
        description: 'Automatically number all pages in your PDF',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'start',
                label: 'Starting Number',
                type: 'number',
                placeholder: '1'
            },
            {
                id: 'position',
                label: 'Number Position',
                type: 'select',
                choices: [
                    { value: 'bottom-right', label: 'Bottom Right' },
                    { value: 'bottom-center', label: 'Bottom Center' },
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'top-right', label: 'Top Right' },
                    { value: 'top-center', label: 'Top Center' },
                    { value: 'top-left', label: 'Top Left' }
                ]
            }
        ]
    },
    'header_footer': {
        title: 'Add Headers & Footers',
        description: 'Insert custom headers and footers on every page',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'header',
                label: 'Header Text',
                type: 'text',
                placeholder: 'e.g., Company Name, Document Title'
            },
            {
                id: 'footer',
                label: 'Footer Text',
                type: 'text',
                placeholder: 'e.g., Page X of Y, Date, Copyright'
            }
        ]
    },
    // AI-Powered Document Intelligence
    'chat_pdf': {
        title: 'Chat with PDF',
        description: 'Ask questions about your PDF using AI',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h6"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'question',
                label: 'Your Question',
                type: 'text',
                placeholder: 'Ask anything about your PDF content...'
            }
        ]
    },
    'analyze_pdf': {
        title: 'AI Analysis',
        description: 'Get AI-powered summary, entities, and topics',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        allowMultiple: false,
        options: []
    },
    'classify_document': {
        title: 'Document Classification',
        description: 'Automatically classify document type using ML',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        allowMultiple: false,
        options: []
    },
    // Workflow Automation
    'workflow': {
        title: 'Automated Workflow',
        description: 'Chain multiple PDF operations automatically',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><path d="M9 15h6"/><path d="M9 11h6"/><path d="M12 18v-6"/><path d="M12 12l-2-2"/><path d="M12 12l2-2"/></svg>,
        allowMultiple: false,
        options: [
            {
                id: 'commands',
                label: 'Workflow Steps',
                type: 'multiselect',
                choices: [
                    { value: 'unlock', label: 'Unlock PDF' },
                    { value: 'ocr', label: 'Run OCR' },
                    { value: 'compress', label: 'Compress' },
                    { value: 'watermark', label: 'Add Watermark' }
                ]
            }
        ]
    }
};

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function App() {
    // Authentication state
    const [isAuthenticated, setIsAuthenticated] = React.useState(false);
    const [currentUser, setCurrentUser] = React.useState(null);
    const [showLogin, setShowLogin] = React.useState(false);
    const [showRegister, setShowRegister] = React.useState(false);
    const [showForgotPassword, setShowForgotPassword] = React.useState(false);
    const [showSetNewPassword, setShowSetNewPassword] = React.useState(false);
    const [showMobileLogin, setShowMobileLogin] = React.useState(false);
    const [resetEmail, setResetEmail] = React.useState('');
    
    // App state
    const [currentToolId, setCurrentToolId] = React.useState(null);
    const [files, setFiles] = React.useState([]);
    const [options, setOptions] = React.useState({});
    const [status, setStatus] = React.useState('idle');
    const [progress, setProgress] = React.useState(0);
    const [errorMessage, setErrorMessage] = React.useState('');
    const [result, setResult] = React.useState(null);
    
    // Refs
    const fileInputRef = React.useRef(null);

    // Check authentication status on mount
    React.useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            console.log('Checking authentication status...');
            const response = await fetch(`${API_BASE_URL}/profile`);
            console.log('Auth check response status:', response.status);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('User authenticated:', userData);
                setCurrentUser(userData);
                setIsAuthenticated(true);
            } else {
                console.log('User not authenticated, status:', response.status);
            }
        } catch (error) {
            console.log('Auth check error:', error);
            // User not authenticated
        }
    };

    const handleLogin = async (credentials) => {
        try {
            console.log('Attempting login with:', credentials);
            
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
                credentials: 'include'
            });
            
            console.log('Login response status:', response.status);
            console.log('Login response headers:', response.headers);
            
            const responseText = await response.text();
            console.log('Login response text:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
            }
            
            if (response.ok) {
                console.log('Login successful:', responseData);
                setIsAuthenticated(true);
                setShowLogin(false);
                checkAuthStatus();
            } else {
                console.error('Login failed:', responseData);
                throw new Error(responseData.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
        }
    };

    const handleRegister = async (userData) => {
        try {
            console.log('Attempting registration with:', userData);
            
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            console.log('Registration response status:', response.status);
            
            const responseText = await response.text();
            console.log('Registration response text:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                throw new Error(`Server returned invalid JSON: ${responseText.substring(0, 100)}`);
            }
            
            if (response.ok) {
                console.log('Registration successful:', responseData);
                alert('Registration successful! Please log in.');
                setShowRegister(false);
                setShowLogin(true);
            } else {
                console.error('Registration failed:', responseData);
                throw new Error(responseData.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert(`Registration failed: ${error.message}`);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/logout`, { credentials: 'include' });
            setIsAuthenticated(false);
            setCurrentUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const currentTool = React.useMemo(() => currentToolId ? toolConfig[currentToolId] : null, [currentToolId]);

    // Reset state when tool changes
    const resetState = React.useCallback(() => {
        setCurrentToolId(null);
        setFiles([]);
        setOptions({});
        setStatus('idle');
        setProgress(0);
        setErrorMessage('');
        setResult(null);
    }, []);

    // Initialize options when tool changes
    React.useEffect(() => {
        if (currentTool && currentTool.options.length > 0) {
            const defaultOptions = currentTool.options.reduce((acc, opt) => {
                if (opt.type === 'select' && opt.choices.length > 0) {
                    acc[opt.id] = opt.choices[0].value;
                } else {
                    acc[opt.id] = '';
                }
                return acc;
            }, {});
            setOptions(defaultOptions);
        }
    }, [currentTool]);

    const handleFilesAdded = React.useCallback((newFiles) => {
        const pdfFiles = newFiles.filter(file => file.type === 'application/pdf');
        if (pdfFiles.length !== newFiles.length) {
            alert("Only PDF files are allowed.");
        }
        if (currentTool && !currentTool.allowMultiple) {
            setFiles(pdfFiles.slice(0, 1));
        } else {
            setFiles(prev => [...prev, ...pdfFiles]);
        }
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [currentTool]);

    const handleRemoveFile = React.useCallback((index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    // Core API interaction logic
    const handleSubmit = async () => {
        if (files.length === 0) return;
        setStatus('uploading');
        setErrorMessage('');
        setResult(null);
        setProgress(0);

        try {
            // Step 1: Upload all files
            const uploadPromises = files.map(async (file, index) => {
                const formData = new FormData();
                formData.append('file', file);
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Upload failed for ${file.name}: ${errText}`);
                }
                setProgress(prev => prev + (50 / files.length));
                return response.json();
            });

            const uploadResults = await Promise.all(uploadPromises);
            const fileKeys = uploadResults.map(res => res.key);

            // Step 2: Start the processing task
            setStatus('processing');
            setProgress(50);
            
            const processResponse = await fetch(`${API_BASE_URL}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: currentToolId,
                    file_keys: fileKeys,
                    params: options,
                }),
                credentials: 'include'
            });

            if (!processResponse.ok) {
                const errText = await processResponse.text();
                throw new Error(`Processing failed: ${errText}`);
            }

            const { task_id } = await processResponse.json();

            // Step 3: Poll for the task result
            const pollTask = (taskId) => new Promise((resolve, reject) => {
                const interval = setInterval(async () => {
                    try {
                        const statusResponse = await fetch(`${API_BASE_URL}/task/${taskId}`, {
                            credentials: 'include'
                        });
                        if (!statusResponse.ok) {
                           clearInterval(interval);
                           const errText = await statusResponse.text();
                           return reject(new Error(`Failed to get task status: ${errText}`));
                        }
                        const data = await statusResponse.json();

                        if (data.status === 'SUCCESS') {
                            clearInterval(interval);
                            setProgress(100);
                            resolve(data.result);
                        } else if (data.status === 'FAILURE') {
                            clearInterval(interval);
                            reject(new Error(data.error || 'Task failed without a specific error.'));
                        } else if (data.status === 'PROGRESS') {
                            setProgress(50 + (data.progress / 2));
                        }
                    } catch (error) {
                         clearInterval(interval);
                         reject(error);
                    }
                }, 2000);
            });

            const taskResult = await pollTask(task_id);
            
            // Step 4: Handle success
            setResult(taskResult);
            setStatus('success');

        } catch (error) {
            console.error("An error occurred:", error);
            setErrorMessage(error.message);
            setStatus('error');
        }
    };
    
    const handleRetry = () => {
        setStatus('idle');
        setErrorMessage('');
    };

    // Render Logic
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans">
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-3xl font-bold text-gray-900">PDF Tool</h1>
                        <p className="mt-2 text-lg text-gray-600">Professional PDF processing with user accounts</p>
                    </div>
                </header>
                
                <main className="max-w-md mx-auto py-12 px-4">
                    {showLogin ? (
                        <LoginForm 
                            onLogin={handleLogin} 
                            onSwitchToRegister={() => setShowRegister(true)} 
                            onForgotPassword={() => setShowForgotPassword(true)}
                            onMobileLogin={() => setShowMobileLogin(true)}
                        />
                    ) : showRegister ? (
                        <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setShowLogin(true)} />
                    ) : showForgotPassword ? (
                        <RequestResetView 
                            onBackToLogin={() => setShowForgotPassword(false)} 
                            onResetSent={(email) => {
                                setResetEmail(email);
                                setShowForgotPassword(false);
                                setShowSetNewPassword(true);
                            }} 
                        />
                    ) : showSetNewPassword ? (
                        <SetNewPasswordView 
                            email={resetEmail} 
                            onPasswordReset={() => {
                                setShowSetNewPassword(false);
                                setShowLogin(true);
                            }} 
                            onBackToLogin={() => setShowSetNewPassword(false)} 
                        />
                    ) : showMobileLogin ? (
                        <MobileLoginView 
                            onBackToLogin={() => setShowMobileLogin(false)} 
                            onLoginSuccess={(user) => {
                                setCurrentUser(user);
                                setIsAuthenticated(true);
                                setShowMobileLogin(false);
                            }} 
                        />
                    ) : (
                        <div className="text-center">
                            <button 
                                onClick={() => setShowLogin(true)}
                                className="bg-red-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors mr-4"
                            >
                                Login
                            </button>
                            <button 
                                onClick={() => setShowRegister(true)}
                                className="bg-gray-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                            >
                                Register
                            </button>
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // Home View: Show all available tools
    if (!currentTool) {
        return (
            <div className="min-h-screen bg-gray-50 font-sans">
                <header className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Welcome, {currentUser?.username}!</h1>
                                <p className="mt-2 text-lg text-gray-600">Every tool you need to work with PDFs in one place</p>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </header>
                
                <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Object.keys(toolConfig).map(toolId => (
                            <ToolCard key={toolId} toolId={toolId} onSelect={setCurrentToolId} />
                        ))}
                    </div>
                </main>
            </div>
        );
    }
    
    // Tool View: The main interface for a selected tool
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={resetState} className="flex items-center text-gray-600 hover:text-gray-900 font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>
                        Back to all tools
                    </button>
                    <span className="text-sm text-gray-500">Logged in as {currentUser?.username}</span>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">{currentTool.title}</h1>
                        <p className="text-gray-500 mt-2">{currentTool.description}</p>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => handleFilesAdded(Array.from(e.target.files))}
                        multiple={currentTool.allowMultiple}
                        accept=".pdf"
                    />

                    {status === 'idle' && (
                        <>
                            {files.length === 0 ? (
                                <Dropzone onFilesAdded={handleFilesAdded} tool={currentTool} onSelectClick={() => fileInputRef.current.click()}/>
                            ) : (
                                <div>
                                    {files.map((file, index) => (
                                        <FileItem key={index} file={file} onRemove={() => handleRemoveFile(index)} />
                                    ))}
                                    {currentTool.allowMultiple && (
                                        <button onClick={() => fileInputRef.current.click()} className="w-full mt-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 transition-colors">
                                            Add more files
                                        </button>
                                    )}
                                </div>
                            )}

                            {files.length > 0 && (
                                <>
                                    <ToolOptions tool={currentTool} options={options} setOptions={setOptions} />
                                    <button
                                        onClick={handleSubmit}
                                        className="w-full mt-8 py-4 bg-red-500 text-white text-lg font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md"
                                    >
                                        {currentTool.title}
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {['uploading', 'processing'].includes(status) && (
                         <div className="text-center py-10">
                            <h2 className="text-2xl font-semibold text-gray-800 mb-4 capitalize">{status}...</h2>
                             <div className="w-full bg-gray-200 rounded-full h-4">
                                 <div className="bg-red-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                             </div>
                             <p className="mt-2 text-gray-600">{Math.round(progress)}%</p>
                         </div>
                    )}

                    {status === 'success' && result && (
                         <div className="text-center py-10">
                             <h2 className="text-2xl font-bold text-green-600 mb-4">Processing Complete!</h2>
                             <p className="text-gray-700 mb-6">Your file is ready for download.</p>
                             <a
                                 href={`${API_BASE_URL}/download?key=${result.key}`}
                                 download={result.filename}
                                 className="inline-block px-10 py-4 bg-red-500 text-white text-lg font-bold rounded-lg hover:bg-red-600 transition-colors shadow-md"
                             >
                                 Download File
                             </a>
                             <p className="text-sm text-gray-500 mt-4">Size: {formatBytes(result.size)}</p>
                         </div>
                    )}
                    
                    {status === 'error' && (
                          <div className="text-center py-10">
                              <h2 className="text-2xl font-bold text-red-600 mb-4">An Error Occurred</h2>
                              <p className="text-gray-700 bg-red-100 p-4 rounded-md">{errorMessage}</p>
                              <button onClick={handleRetry} className="mt-6 px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors">
                                  Try Again
                              </button>
                          </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Authentication Components
const LoginForm = ({ onLogin, onSwitchToRegister, onForgotPassword, onMobileLogin }) => {
    const [formData, setFormData] = React.useState({ username: '', password: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(formData);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                    Login
                </button>
            </form>
            
            <div className="mt-4 space-y-3">
                <div className="text-center">
                    <button onClick={onForgotPassword} className="text-red-500 hover:text-red-600 text-sm">
                        Forgot Password?
                    </button>
                </div>
                <div className="text-center">
                    <button onClick={onMobileLogin} className="text-blue-500 hover:text-blue-600 text-sm">
                        Login with Mobile
                    </button>
                </div>
                <p className="text-center text-gray-600">
                    Don't have an account?{' '}
                    <button onClick={onSwitchToRegister} className="text-red-500 hover:text-red-600">
                        Register here
                    </button>
                </p>
            </div>
        </div>
    );
};

const RegisterForm = ({ onRegister, onSwitchToLogin }) => {
    const [formData, setFormData] = React.useState({ username: '', email: '', password: '', confirmPassword: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        onRegister({ username: formData.username, email: formData.email, password: formData.password });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Register</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                    Register
                </button>
            </form>
            <p className="mt-4 text-center text-gray-600">
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="text-red-500 hover:text-red-600">
                    Login here
                </button>
            </p>
        </div>
    );
};

// Request Password Reset Form
const RequestResetView = ({ onBackToLogin, onResetSent }) => {
    const [email, setEmail] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage(data.message);
                setTimeout(() => onResetSent(email), 2000);
            } else {
                setMessage(data.error || 'Failed to send reset email');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Reset Password</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter your email address"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
            
            {message && (
                <div className={`mt-4 p-3 rounded-md text-sm ${
                    message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                    {message}
                </div>
            )}
            
            <div className="mt-4 text-center">
                <button onClick={onBackToLogin} className="text-red-500 hover:text-red-600">
                    Back to Login
                </button>
            </div>
        </div>
    );
};

// Set New Password Form
const SetNewPasswordView = ({ email, onPasswordReset, onBackToLogin }) => {
    const [formData, setFormData] = React.useState({ new_password: '', confirm_password: '' });
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.new_password !== formData.confirm_password) {
            setMessage('Passwords do not match');
            return;
        }

        if (formData.new_password.length < 6) {
            setMessage('Password must be at least 6 characters long');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            // Extract token from URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token') || window.location.pathname.split('/').pop();
            
            const response = await fetch(`/reset-password/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: formData.new_password })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('Password reset successfully!');
                setTimeout(() => onPasswordReset(), 2000);
            } else {
                setMessage(data.error || 'Failed to reset password');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Set New Password</h2>
            <p className="text-center text-gray-600 mb-4">Reset password for: {email}</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                        type="password"
                        value={formData.new_password}
                        onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter new password"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Confirm new password"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>
            
            {message && (
                <div className={`mt-4 p-3 rounded-md text-sm ${
                    message.includes('error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                    {message}
                </div>
            )}
            
            <div className="mt-4 text-center">
                <button onClick={onBackToLogin} className="text-backToLogin} className="text-red-500 hover:text-red-600">
                    Back to Login
                </button>
            </div>
        </div>
    );
};

// Mobile Login Form
const MobileLoginView = ({ onBackToLogin, onLoginSuccess }) => {
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [otpSent, setOtpSent] = React.useState(false);

    const handleSendOTP = async () => {
        if (!phoneNumber) {
            setMessage('Please enter a phone number');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('OTP sent successfully! Check your phone.');
                setOtpSent(true);
            } else {
                setMessage(data.error || 'Invalid OTP');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        
        if (!otp) {
            setMessage('Please enter the OTP');
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch('/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber, otp })
            });

            const data = await response.json();
            
            if (response.ok) {
                setMessage('Login successful!');
                setTimeout(() => onLoginSuccess(data.user), 1000);
            } else {
                setMessage(data.error || 'Invalid OTP');
            }
        } catch (error) {
            setMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl fontBuilder: The apply model made the following changes to the file:

```
            <div className="text-center">
                <button onClick={onBackToLogin} className="text-backToLogin} className="text-red-500 hover:text-red-600">
                    Back to Login
                </button>
                    Back to Login
                </button>
            </div>
        </div>
    );
};

// Existing Components
const ToolCard = ({ toolId, onSelect }) => {
    const tool = toolConfig[toolId];
    return (
        <div 
            onClick={() => onSelect(toolId)}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-red-300"
        >
            <div className="text-red-500 mb-4 flex justify-center">
                {React.cloneElement(tool.icon, { width: 48, height: 48 })}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-2">{tool.title}</h3>
            <p className="text-gray-600 text-sm text-center">{tool.description}</p>
        </div>
    );
};

const FileItem = ({ file, onRemove }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md mb-2">
            <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mr-3">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14,2 14,8 20,8"/>
                </svg>
                <span className="text-gray-700 font-medium">{file.name}</span>
                <span className="text-gray-500 text-sm ml-2">({formatBytes(file.size)})</span>
            </div>
            <button 
                onClick={onRemove}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    );
};

const ToolOptions = ({ tool, options, setOptions }) => {
    if (!tool.options || tool.options.length === 0) return null;

    return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Options</h3>
            {tool.options.map((option) => (
                <div key={option.id} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {option.label}
                    </label>
                    {option.type === 'select' ? (
                        <select
                            value={options[option.id] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.id]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                            {option.choices.map((choice) => (
                                <option key={choice.value} value={choice.value}>
                                    {choice.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={option.type}
                            value={options[option.id] || ''}
                            onChange={(e) => setOptions(prev => ({ ...prev, [option.id]: e.target.value }))}
                            placeholder={option.placeholder || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    )}
                </div>
            ))}
        </div>
    );
};

const Dropzone = ({ onFilesAdded, tool, onSelectClick }) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDrag = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesAdded(Array.from(e.dataTransfer.files));
            e.dataTransfer.clearData();
        }
    }, [onFilesAdded]);

    return (
        <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors duration-200 ${isDragging ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}`}
        >
            <div className="text-red-500 mb-4">{React.cloneElement(tool.icon, { width: 48, height: 48 })}</div>
            <p className="text-xl font-semibold text-gray-700">Drop PDF files here</p>
            <p className="text-gray-500 mt-1">or</p>
            <button onClick={onSelectClick} className="mt-4 px-6 py-2 bg-red-500 text-white font-semibold rounded-md cursor-pointer hover:bg-red-600 transition-colors">
                Select Files
            </button>
        </div>
    );
};
